import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Radio from '@mui/material/Radio';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import {
  getParties,
  getFbrInvoice,
  getBillingItems,
  getClientInvoice,
  getBillingLocations,
  getBillingProvinces,
  createClientInvoice,
  updateClientInvoice,
  getInvoicePartyContext,
  getBillingSalesAccounts,
} from 'src/api/finance';

import FbrInvoicePanel from './fbr-invoice-panel';
import { buildSalesTaxInvoicePdf } from './sales-tax-invoice-pdf';

// ---------------------------------------------------------------------------
// The Debit Invoice form, laid out as the legacy screen is and carrying every
// box it has, for a new invoice and for an existing one.
//
//   top       client (Sub Code), sale account, terms, province, narration;
//             date, LPO no., salary month, payment terms and the Yes/No beside
//             it; credit limit and outstanding; then the client's addresses.
//             The invoice number is the database's own - assigned on save,
//             shown in the heading after that.
//   details   item, description, description 2, UOM, quantity, rate, amount
//   foot      subject, location, status, PO and SES numbers, exemption; sales,
//             discount, gross, transportation, tax rate and amount, net
//
// The figures are worked out the way legacy does: gross = sales - discount,
// tax = rate% of gross in whole rupees, net = gross + transportation + tax.
// The server works them out again when it posts, so the two always agree.
// ---------------------------------------------------------------------------

const TERMS = ['ADVANCE PAYMENT', 'POST-SERVICE PAYMENT'];
const STATUSES = ['Live', 'Cancel'];

// The client debited is always a debtor - main account 13, DEBTORS. The server
// holds the same rule, along with the sales ledgers and the province rates.
const DEBTORS_CA = 13;

const fMoney = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const str = (v) => (v === null || v === undefined ? '' : String(v));

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** yyyy-mm-dd in local time, so a date never slips a day on its way to the server. */
const isoDay = (d) => {
  if (!d) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const emptyLine = () => ({
  item: null,
  description: '',
  description2: '',
  uom: 'NOS',
  qty: '',
  rate: '',
});

const emptyForm = () => ({
  invoiceDate: new Date(),
  party: null, // { caCode, acCode, subCode, description }
  salesAccount: null, // { caCode, acCode, description }
  paymentTerms: 'ADVANCE PAYMENT',
  province: 'Sindh',
  narration: '',
  billingRef: '',
  salaryMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  paymentDays: '',
  invGenerated: 'No',
  subject: '',
  locCode: 1,
  status: 'Live',
  poNo: '',
  sesNo: '',
  discount: '0',
  transportation: '0',
  taxRate: '',
  exemption: false,
});

const ADDRESS_FIELDS = [
  'address1',
  'address2',
  'telephone',
  'cellPhone',
  'email',
  'contactPerson',
  'designation',
];

/** Two addresses are the same one when every field matches, ignoring spacing and case. */
const sameAddress = (a, b) =>
  !!a &&
  !!b &&
  ADDRESS_FIELDS.every(
    (key) => str(a[key]).replace(/\s+/g, ' ').trim().toUpperCase() === str(b[key]).replace(/\s+/g, ' ').trim().toUpperCase()
  );

const partyLabel = (p) =>
  p ? `${String(p.subCode).padStart(6, '0')}  ${str(p.description).trim()}` : '';

// A sales ledger: 19-2 SALE AND INCOME, or an OTHER INCOME ledger as 19-15-4.
const accountCode = (a) => `${a.caCode}-${a.acCode}${a.subCode ? `-${a.subCode}` : ''}`;
const accountLabel = (a) => (a ? `${accountCode(a)}  ${str(a.description).trim()}` : '');
const sameAccount = (a, b) =>
  !!a && !!b && a.caCode === b.caCode && a.acCode === b.acCode && (a.subCode || 0) === (b.subCode || 0);

// One Province entry per rate it is charged at: Sindh (8%) and Sindh (15%).
const rateText = (rate) => `${Number(rate).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
const provinceKey = (province, rate) => (province ? `${province}|${num(rate)}` : '');

// ---------------------------------------------------------------------------

export default function ClientInvoiceFormView({ invoiceNo }) {
  const settings = useSettingsContext();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const editing = !!invoiceNo;

  const [form, setForm] = useState(emptyForm);
  const [lines, setLines] = useState([emptyLine()]);
  const [context, setContext] = useState({ creditLimit: 0, outstanding: 0, addresses: [] });
  // Why the address panel is empty when it is not the client's own doing.
  const [addressError, setAddressError] = useState(null);
  // Which of the client's addresses the invoice is made out to; null is
  // the client's own address, as every legacy invoice is.
  const [billIndex, setBillIndex] = useState(null);

  const [items, setItems] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [locations, setLocations] = useState([]);

  const [partyOptions, setPartyOptions] = useState([]);
  const [partySearch, setPartySearch] = useState('');
  // SALE AND INCOME and the OTHER INCOME ledgers - all the form offers.
  const [salesAccounts, setSalesAccounts] = useState([]);

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  // Bumped on each save, so the FBR panel rebuilds what it would send.
  const [fbrRefresh, setFbrRefresh] = useState(0);

  const set = (field) => (event) => {
    const { value, checked, type } = event.target;
    setForm((f) => ({ ...f, [field]: type === 'checkbox' ? checked : value }));
  };

  // ---------------------------------------------------------- the pickers
  // Each list loads on its own, so one the server cannot answer does not
  // leave the others empty - a missing location list once blanked Province.
  useEffect(() => {
    (async () => {
      const [itemList, provinceList, locationList] = await Promise.allSettled([
        getBillingItems(),
        getBillingProvinces(),
        getBillingLocations(),
      ]);
      if (itemList.status === 'fulfilled') setItems(itemList.value || []);
      if (provinceList.status === 'fulfilled') setProvinces(provinceList.value || []);
      if (locationList.status === 'fulfilled') {
        setLocations(
          (locationList.value || []).map((l) => ({ locCode: l.locCode ?? l.LocCode, name: l.name ?? l.Name }))
        );
      }
      [itemList, provinceList, locationList]
        .filter((r) => r.status === 'rejected')
        .forEach((r) => console.error(r.reason));
    })();
  }, []);

  // The sales ledgers; a new invoice starts on SALE AND INCOME (19-2), which
  // every legacy invoice uses.
  useEffect(() => {
    (async () => {
      try {
        const list = (await getBillingSalesAccounts()) || [];
        setSalesAccounts(list);
        if (!editing) {
          const sale = list.find((a) => a.caCode === 19 && a.acCode === 2 && !a.subCode) || list[0];
          if (sale) setForm((f) => (f.salesAccount ? f : { ...f, salesAccount: sale }));
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [editing]);

  // Only debtors can be billed.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await getParties({ page: 1, pageSize: 50, caCode: DEBTORS_CA, search: partySearch });
        if (!cancelled) setPartyOptions(res.records || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [partySearch]);

  // ------------------------------------------------------- the invoice
  const loadInvoice = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const inv = await getClientInvoice(invoiceNo);
      setForm({
        invoiceDate: toDate(inv.invoiceDate) || new Date(),
        party: {
          caCode: inv.caCode,
          acCode: inv.acCode,
          subCode: inv.subCode,
          description: inv.customerName || inv.customerAccountName || '',
        },
        salesAccount: inv.caCodeSal
          ? {
              caCode: inv.caCodeSal,
              acCode: inv.acCodeSal,
              subCode: inv.subCodeSal || 0,
              description: inv.salesAccountName || '',
            }
          : null,
        paymentTerms: str(inv.paymentTerms),
        province: str(inv.province),
        narration: str(inv.narration),
        billingRef: str(inv.billingRef),
        salaryMonth: toDate(inv.salaryMonth),
        paymentDays: str(inv.paymentDays),
        invGenerated: inv.invGenerated === 'Yes' ? 'Yes' : 'No',
        subject: str(inv.locationText),
        locCode: inv.locCode || 1,
        status: inv.status === 'Cancel' ? 'Cancel' : 'Live',
        poNo: str(inv.poNo).trim(),
        sesNo: str(inv.sesNo).trim(),
        discount: str(inv.discount ?? 0),
        transportation: str(inv.transportation ?? 0),
        taxRate: str(inv.taxRate ?? ''),
        exemption: num(inv.taxAmount) === 0,
      });
      setLines(
        (inv.lines || []).map((l) => ({
          item: {
            itemName: str(l.itemName).trim(),
            groupCode: l.groupCode,
            description: str(l.itemDescription || l.description).trim(),
          },
          description: str(l.description).trim(),
          description2: str(l.description2 ?? l.invoiceDescription).trim(),
          uom: str(l.uom).trim() || 'NOS',
          qty: str(l.qty),
          rate: str(l.rate),
        }))
      );
      setContext((c) => ({
        ...c,
        creditLimit: inv.creditLimit || 0,
        // The balance before this invoice, as legacy shows it.
        outstanding: inv.outstanding || 0,
      }));

      // Only the addresses come from the client lookup when editing; the
      // invoice keeps its own terms. A failed lookup costs the panel, not
      // the invoice.
      // The address the invoice was saved with, if one was chosen.
      const saved = {
        address1: inv.billAddress1,
        address2: inv.billAddress2,
        telephone: inv.billTelephone,
        cellPhone: inv.billCellPhone,
        email: inv.billEmail,
        contactPerson: inv.billContactPerson,
        designation: inv.billDesignation,
      };
      const hasSaved = ADDRESS_FIELDS.some((key) => str(saved[key]).trim());

      let list = [];
      try {
        const ctx = await getInvoicePartyContext(inv.caCode, inv.acCode, inv.subCode);
        list = ctx.addresses || [];
        setAddressError(null);
      } catch (err) {
        setAddressError(err.message || 'Could not load the addresses');
      }

      // The saved address is picked out of the client's list; if the client's
      // addresses have changed since, it still shows, marked as the invoice's own.
      let index = hasSaved ? list.findIndex((a) => sameAddress(a, saved)) : -1;
      if (hasSaved && index < 0) {
        list = [{ ...saved, savedOnInvoice: true }, ...list];
        index = 0;
      }
      setContext((c) => ({ ...c, addresses: list }));
      setBillIndex(index >= 0 ? index : null);
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not load the invoice', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [editing, invoiceNo, enqueueSnackbar]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // --------------------------------------------- the province and its rate
  // The Province list has an entry per rate - Sindh (8%), Sindh (15%) - and the
  // entry picked is the tax rate; it is not typed. An invoice saved at a rate
  // no longer offered (Sindh 10%) keeps it as an entry of its own.
  const provinceOptions = useMemo(() => {
    const list = provinces.flatMap((p) =>
      (p.rates?.length ? p.rates : [p.defaultRate ?? 0]).map((rate) => ({
        key: provinceKey(p.province, rate),
        province: p.province,
        rate: num(rate),
        label: `${p.province} (${rateText(rate)})`,
      }))
    );
    const current = provinceKey(form.province, form.taxRate);
    if (editing && form.province && form.taxRate !== '' && !list.some((o) => o.key === current)) {
      list.push({
        key: current,
        province: form.province,
        rate: num(form.taxRate),
        label: `${form.province} (${num(form.taxRate) ? rateText(form.taxRate) : 'no tax'}) - as saved on this invoice`,
      });
    }
    return list;
  }, [editing, provinces, form.province, form.taxRate]);

  // The sales ledgers, plus an older invoice's own when it is not one of them.
  const salesOptions = useMemo(() => {
    const own = form.salesAccount;
    if (!own || salesAccounts.some((a) => sameAccount(a, own))) return salesAccounts;
    return [...salesAccounts, own];
  }, [salesAccounts, form.salesAccount]);
  const salesValue = salesOptions.find((a) => sameAccount(a, form.salesAccount)) || null;

  /** A province and rate the list offers: the rate asked for if it is one, else the province's usual one. */
  const offeredRate = (province, rate) => {
    const own = provinces.find((p) => p.province === province);
    const rates = own?.rates?.length ? own.rates : [own?.defaultRate].filter((r) => r != null);
    if (rate != null && rates.some((r) => Math.abs(num(r) - num(rate)) < 0.005)) return String(num(rate));
    return rates.length ? String(num(rates[0])) : '';
  };

  // ------------------------------------------------- picking the client
  const handlePartyChange = async (event, party) => {
    setForm((f) => ({ ...f, party }));
    setAddressError(null);
    setBillIndex(null);
    if (!party) {
      setContext({ creditLimit: 0, outstanding: 0, addresses: [] });
      return;
    }
    try {
      const ctx = await getInvoicePartyContext(party.caCode, party.acCode, party.subCode);
      setContext({
        creditLimit: ctx.creditLimit || 0,
        outstanding: ctx.outstanding || 0,
        addresses: ctx.addresses || [],
      });
      // A new client's invoice goes to their first address until another is picked.
      setBillIndex((ctx.addresses || []).length ? 0 : null);

      // A new invoice starts from the client's own terms; an existing one
      // keeps what it was saved with. Payment days come from the debtors form
      // (the server falls back to the last invoice's when none is set there),
      // and stay editable here.
      if (!editing) {
        setForm((f) => {
          const next = {
            ...f,
            paymentDays: ctx.paymentDays != null ? String(ctx.paymentDays) : f.paymentDays,
          };
          if (!ctx.lastInvoiceNo) return next;

          const province = ctx.province || f.province;
          const lastSales = salesAccounts.find((a) =>
            sameAccount(a, { caCode: ctx.caCodeSal, acCode: ctx.acCodeSal, subCode: ctx.subCodeSal })
          );
          return {
            ...next,
            paymentTerms: ctx.paymentTerms || f.paymentTerms,
            province,
            // The last invoice's rate only if the province is still charged at it.
            taxRate: offeredRate(province, ctx.taxRate),
            subject: ctx.subject || f.subject,
            locCode: ctx.locCode || f.locCode,
            salesAccount: lastSales || f.salesAccount,
          };
        });
      }
    } catch (err) {
      console.error(err);
      setContext({ creditLimit: 0, outstanding: 0, addresses: [] });
      setAddressError(err.message || 'Could not load the client');
    }
  };

  // A new invoice starts on the province's usual rate (Sindh 8%).
  const provinceRate = provinces.find((p) => p.province === form.province)?.defaultRate;
  useEffect(() => {
    if (!editing && form.taxRate === '' && provinceRate != null) {
      setForm((f) => (f.taxRate === '' ? { ...f, taxRate: String(provinceRate) } : f));
    }
  }, [editing, provinceRate, form.taxRate]);

  // ------------------------------------------------------------ the lines
  const editLine = (index, field, value) =>
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const pickItem = (index, item) =>
    setLines((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const wording = str(item?.description).trim();
        // A new pick brings its own wording, unless the user had typed their own.
        const keep = (current, previous) => (current && current !== previous ? current : wording);
        const previous = str(row.item?.description).trim();
        return {
          ...row,
          item,
          description: keep(row.description, previous),
          description2: keep(row.description2, previous),
          uom: str(item?.uom).trim() || row.uom || 'NOS',
        };
      })
    );

  // ------------------------------------------------------------ the totals
  const totals = useMemo(() => {
    const sales = lines.reduce((s, l) => s + num(l.qty) * num(l.rate), 0);
    const gross = sales - num(form.discount);
    const tax = form.exemption ? 0 : Math.round((gross * num(form.taxRate)) / 100);
    const net = gross + num(form.transportation) + tax;
    return { sales, gross, tax, net };
  }, [lines, form.discount, form.transportation, form.taxRate, form.exemption]);

  const validLines = lines.filter((l) => l.item && num(l.qty) !== 0 && num(l.rate) !== 0);
  const canSave =
    !!form.party && !!form.salesAccount && validLines.length > 0 && totals.gross > 0 && !saving && !loading;

  // ------------------------------------------------------------- the save
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        invoiceDate: isoDay(form.invoiceDate),
        caCode: form.party.caCode,
        acCode: form.party.acCode,
        subCode: form.party.subCode ?? 0,
        caCodeSal: form.salesAccount.caCode,
        acCodeSal: form.salesAccount.acCode,
        subCodeSal: form.salesAccount.subCode || 0,
        narration: form.narration.trim() || null,
        billingRef: form.billingRef.trim() || null,
        paymentTerms: form.paymentTerms || null,
        province: form.province || null,
        taxRate: num(form.taxRate),
        exemption: form.exemption,
        locCode: Number(form.locCode) || 1,
        salaryMonth: isoDay(form.salaryMonth),
        paymentDays: form.paymentDays === '' ? null : Number(form.paymentDays) || 0,
        invGenerated: form.invGenerated,
        subject: form.subject || null,
        billTo:
          billIndex != null && context.addresses[billIndex]
            ? ADDRESS_FIELDS.reduce(
                (address, key) => ({ ...address, [key]: str(context.addresses[billIndex][key]).trim() || null }),
                {}
              )
            : null,
        poNo: form.poNo.trim() || null,
        sesNo: form.sesNo.trim() || null,
        status: form.status,
        discount: num(form.discount),
        transportation: num(form.transportation),
        lines: validLines.map((l, i) => ({
          slNo: i + 1,
          itemName: l.item.itemName,
          groupCode: l.item.groupCode,
          itemDescription: l.item.description,
          description: l.description.trim() || l.item.description,
          description2: l.description2.trim() || null,
          uom: l.uom.trim() || 'NOS',
          qty: num(l.qty),
          rate: num(l.rate),
        })),
      };

      if (editing) {
        await updateClientInvoice(invoiceNo, payload);
        enqueueSnackbar(`Invoice ${invoiceNo} saved`, { variant: 'success' });
        await loadInvoice();
        setFbrRefresh((n) => n + 1);
      } else {
        const res = await createClientInvoice(payload);
        // Stays on the invoice just posted, so it can be printed or changed
        // straight away rather than found again in the list.
        enqueueSnackbar(`Invoice ${res.invoiceNo} posted - print or change it here`, { variant: 'success' });
        router.replace(paths.dashboard.Finance.vouchers.billingEdit(res.invoiceNo));
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not save the invoice', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (format) => {
    setPrinting(true);
    try {
      // A live FBR report puts FBR's number and QR code on the invoice. If FBR's
      // side cannot be read, the invoice prints as before.
      const [invoice, fbr] = await Promise.all([
        getClientInvoice(invoiceNo),
        getFbrInvoice(invoiceNo).catch(() => null),
      ]);
      const url = await buildSalesTaxInvoicePdf(invoice, { format, fbr: fbr?.reported ?? null });
      window.open(url, '_blank');
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not build the invoice', { variant: 'error' });
    } finally {
      setPrinting(false);
    }
  };

  // ---------------------------------------------------------------- page
  const readOnlyMoney = (label, value) => (
    <TextField
      label={label}
      value={fMoney(value)}
      size="small"
      fullWidth
      InputProps={{ readOnly: true }}
      inputProps={{ style: { textAlign: 'right' } }}
      sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
    />
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading={editing ? `Debit Invoice ${invoiceNo}` : 'New Debit Invoice'}
        links={[
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Client Invoices', href: paths.dashboard.Finance.vouchers.billingList },
          { name: editing ? String(invoiceNo) : 'New' },
        ]}
        action={
          <Button
            variant="outlined"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => router.push(paths.dashboard.Finance.vouchers.billingNew)}
            disabled={!editing}
          >
            New Invoice
          </Button>
        }
        sx={{ mb: 3 }}
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {form.status === 'Cancel' && (
        <Chip color="error" label="This invoice is cancelled" sx={{ mb: 2 }} />
      )}

      <Grid container spacing={3}>
        {/* =================================================== the form */}
        <Grid item xs={12}>
          {/* ---------------------------------------------- the header */}
          <Card sx={{ p: 2.5, mb: 2.5 }}>
            <Grid container spacing={2}>
              {/* left half */}
              <Grid item xs={12} md={7}>
                <Stack spacing={2}>
                  <Autocomplete
                    size="small"
                    options={partyOptions}
                    value={form.party}
                    onChange={handlePartyChange}
                    onInputChange={(e, value, reason) => {
                      if (reason === 'input') setPartySearch(value);
                    }}
                    filterOptions={(x) => x}
                    getOptionLabel={partyLabel}
                    isOptionEqualToValue={(o, v) =>
                      o.caCode === v.caCode && o.acCode === v.acCode && o.subCode === v.subCode
                    }
                    renderOption={(props, o) => (
                      <li {...props} key={`${o.caCode}-${o.acCode}-${o.subCode}`}>
                        <Box>
                          <Typography variant="body2">{partyLabel(o)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {o.caCode}-{o.acCode}-{o.subCode} · {str(o.accountName)}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Client account (Debtors)" />
                    )}
                  />

                  <Autocomplete
                    size="small"
                    options={salesOptions}
                    value={salesValue}
                    onChange={(e, value) => setForm((f) => ({ ...f, salesAccount: value }))}
                    groupBy={(o) => str(o.accountName || o.description).trim()}
                    getOptionLabel={accountLabel}
                    isOptionEqualToValue={sameAccount}
                    renderOption={(props, o) => (
                      <li {...props} key={accountCode(o)}>
                        {accountLabel(o)}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Sales account (Sale & Income / Other Income)" />
                    )}
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Terms"
                      value={form.paymentTerms}
                      onChange={set('paymentTerms')}
                    >
                      {[...new Set([...TERMS, form.paymentTerms].filter(Boolean))].map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Province (sets the sales tax)"
                      value={
                        provinceOptions.some((o) => o.key === provinceKey(form.province, form.taxRate))
                          ? provinceKey(form.province, form.taxRate)
                          : ''
                      }
                      onChange={(event) => {
                        const picked = provinceOptions.find((o) => o.key === event.target.value);
                        setForm((f) => ({
                          ...f,
                          province: picked?.province || '',
                          taxRate: picked ? String(picked.rate) : '0',
                        }));
                      }}
                    >
                      <MenuItem value="">— (no sales tax)</MenuItem>
                      {provinceOptions.map((o) => (
                        <MenuItem key={o.key} value={o.key}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <TextField
                    size="small"
                    label="Narration"
                    value={form.narration}
                    onChange={set('narration')}
                    inputProps={{ maxLength: 100 }}
                  />
                </Stack>
              </Grid>

              {/* right half */}
              <Grid item xs={12} md={5}>
                <Stack spacing={2}>
                  <DatePicker
                    label="Voucher Date"
                    value={form.invoiceDate}
                    onChange={(d) => setForm((f) => ({ ...f, invoiceDate: d }))}
                    format="dd/MM/yyyy"
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                  <TextField
                    size="small"
                    label="LPO No"
                    value={form.billingRef}
                    onChange={set('billingRef')}
                    inputProps={{ maxLength: 100 }}
                  />
                  <DatePicker
                    label="Salary Month"
                    views={['year', 'month']}
                    value={form.salaryMonth}
                    onChange={(d) =>
                      setForm((f) => ({
                        ...f,
                        salaryMonth: d ? new Date(d.getFullYear(), d.getMonth(), 1) : null,
                      }))
                    }
                    format="MMM yyyy"
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      label="Payment Terms (days)"
                      value={form.paymentDays}
                      onChange={set('paymentDays')}
                    />
                    <TextField
                      select
                      size="small"
                      label="Inv. generated"
                      value={form.invGenerated}
                      onChange={set('invGenerated')}
                      sx={{ minWidth: 130 }}
                    >
                      <MenuItem value="No">No</MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    {readOnlyMoney('Credit Limit', context.creditLimit)}
                    {readOnlyMoney('Outstandings', context.outstanding)}
                  </Stack>
                </Stack>
              </Grid>

              {/* The client's addresses, as the legacy grid lists them. */}
              <Grid item xs={12}>
                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Client addresses</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {form.party ? str(form.party.description).trim() : 'Pick a client to see them'}
                  </Typography>
                  {form.party && context.addresses.length > 0 && (
                    <Typography variant="caption" color={billIndex == null ? 'warning.main' : 'success.main'}>
                      {billIndex == null
                        ? "— none picked: the invoice prints the client's own address"
                        : `— the invoice goes to address ${billIndex + 1}`}
                    </Typography>
                  )}
                </Stack>
                <TableContainer
                  sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1, maxHeight: 220 }}
                >
                  <Table size="small" stickyHeader sx={{ minWidth: 960 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell sx={{ width: 50 }}>S.N</TableCell>
                        <TableCell>Address 1</TableCell>
                        <TableCell>Address 2</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Telephone</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Cell Phone</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Contact Person</TableCell>
                        <TableCell>Designation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {context.addresses.map((a, i) => (
                        // Addresses carry no key of their own.
                        // eslint-disable-next-line react/no-array-index-key
                        <TableRow
                          key={i}
                          hover
                          selected={billIndex === i}
                          // A click picks the row; clicking the picked one again
                          // goes back to the client's own address.
                          onClick={() => setBillIndex((current) => (current === i ? null : i))}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            <Radio size="small" checked={billIndex === i} inputProps={{ 'aria-label': `Address ${i + 1}` }} />
                          </TableCell>
                          <TableCell>
                            {i + 1}
                            {a.savedOnInvoice && (
                              <Chip size="small" variant="outlined" label="on this invoice" sx={{ ml: 1 }} />
                            )}
                          </TableCell>
                          <TableCell>{str(a.address1)}</TableCell>
                          <TableCell>{str(a.address2)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{str(a.telephone)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{str(a.cellPhone)}</TableCell>
                          <TableCell>{str(a.email)}</TableCell>
                          <TableCell>{str(a.contactPerson).trim()}</TableCell>
                          <TableCell>{str(a.designation).trim()}</TableCell>
                        </TableRow>
                      ))}
                      {!context.addresses.length && (
                        <TableRow>
                          <TableCell colSpan={9}>
                            {addressError ? (
                              // Not the same as a client with no address: the
                              // lookup itself failed, so say that rather than mislead.
                              <Typography variant="body2" color="error.main" align="center" sx={{ py: 1.5 }}>
                                Could not load the addresses ({addressError})
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 1.5 }}>
                                {form.party ? 'No address on file for this client' : 'No client picked yet'}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Card>

          {/* --------------------------------------------- the details */}
          <Card sx={{ mb: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2.5, py: 1.5 }}
            >
              <Typography variant="subtitle1">Details</Typography>
              <Button
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={() => setLines((rows) => [...rows, emptyLine()])}
              >
                Add line
              </Button>
            </Stack>
            <Divider />
            <TableContainer>
              <Table size="small" sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 44 }}>S.N</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Item</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Description</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Description2</TableCell>
                    <TableCell sx={{ minWidth: 84 }}>UOM</TableCell>
                    <TableCell sx={{ minWidth: 100, whiteSpace: 'nowrap' }} align="right">
                      Qty
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }} align="right">
                      Rate
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }} align="right">
                      Amount
                    </TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line, index) => (
                    // Lines have no key of their own until they are saved.
                    // eslint-disable-next-line react/no-array-index-key
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Autocomplete
                          size="small"
                          options={items}
                          value={line.item}
                          onChange={(e, value) => pickItem(index, value)}
                          getOptionLabel={(o) => (o ? `${o.itemName}  ${str(o.description).trim()}` : '')}
                          isOptionEqualToValue={(o, v) =>
                            str(o.itemName).trim() === str(v.itemName).trim() && o.groupCode === v.groupCode
                          }
                          renderOption={(props, o) => (
                            <li {...props} key={`${o.groupCode}-${o.itemName}`}>
                              {o.itemName} &nbsp; {o.description}
                            </li>
                          )}
                          renderInput={(params) => <TextField {...params} placeholder="Item..." />}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={line.description}
                          onChange={(e) => editLine(index, 'description', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={line.description2}
                          onChange={(e) => editLine(index, 'description2', e.target.value)}
                          placeholder="Printed on the invoice"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={line.uom}
                          onChange={(e) => editLine(index, 'uom', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={line.qty}
                          onChange={(e) => editLine(index, 'qty', e.target.value)}
                          inputProps={{ step: '0.001', style: { textAlign: 'right' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={line.rate}
                          onChange={(e) => editLine(index, 'rate', e.target.value)}
                          inputProps={{ step: '0.01', style: { textAlign: 'right' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{fMoney(num(line.qty) * num(line.rate))}</Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={lines.length <= 1}
                          onClick={() => setLines((rows) => rows.filter((_, i) => i !== index))}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* ------------------------------------------------ the foot */}
          <Card sx={{ p: 2.5 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="Subject"
                    multiline
                    minRows={2}
                    value={form.subject}
                    onChange={set('subject')}
                    helperText="Printed on the invoice, e.g. PREMISES ... CLIFTON, KARACHI"
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Location"
                      value={form.locCode}
                      onChange={set('locCode')}
                    >
                      {(locations.length ? locations : [{ locCode: 1, name: 'KARACHI' }]).map((l) => (
                        <MenuItem key={l.locCode} value={l.locCode}>
                          {l.locCode} — {l.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      label="Status"
                      value={form.status}
                      onChange={set('status')}
                      sx={{ minWidth: 140 }}
                    >
                      {STATUSES.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField size="small" fullWidth label="PO No" value={form.poNo} onChange={set('poNo')} />
                    <TextField size="small" fullWidth label="SES No" value={form.sesNo} onChange={set('sesNo')} />
                  </Stack>
                  <FormControlLabel
                    control={<Checkbox checked={form.exemption} onChange={set('exemption')} />}
                    label="Exemption (no sales tax)"
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                {/* Four columns, so the tax rate and its amount each get a box:
                    Sales | Discount | Gross (two wide)
                    Transportation | S.T % | Sales Tax | Nett */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 0.75fr 1fr 1fr', gap: 2 }}>
                  {readOnlyMoney('Sales Total', totals.sales)}
                  <TextField
                    size="small"
                    type="number"
                    label="Discount"
                    value={form.discount}
                    onChange={set('discount')}
                    inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                  />
                  <Box sx={{ gridColumn: 'span 2' }}>{readOnlyMoney('Gross Total', totals.gross)}</Box>

                  <TextField
                    size="small"
                    type="number"
                    label="Transportation"
                    value={form.transportation}
                    onChange={set('transportation')}
                    inputProps={{ step: '0.01', style: { textAlign: 'right' } }}
                  />
                  {/* Set by the Province picked, not typed. */}
                  <TextField
                    size="small"
                    label="S.T %"
                    value={form.exemption ? '0' : form.taxRate || '0'}
                    title="Set by the Province picked above"
                    InputProps={{
                      readOnly: true,
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
                  />
                  {readOnlyMoney('Sales Tax', totals.tax)}
                  <TextField
                    size="small"
                    label="Nett Total"
                    value={fMoney(totals.net)}
                    InputProps={{ readOnly: true }}
                    inputProps={{ style: { textAlign: 'right', fontWeight: 700 } }}
                    sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
                  />
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2.5 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => router.push(paths.dashboard.Finance.vouchers.billingList)}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
                onClick={() => handlePrint('letterhead')}
                disabled={!editing || printing}
              >
                Print GST
              </Button>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
                onClick={() => handlePrint('plain')}
                disabled={!editing || printing}
              >
                Print GST (plain)
              </Button>
              <Button
                variant="contained"
                startIcon={<Iconify icon="eva:save-fill" />}
                onClick={handleSave}
                disabled={!canSave}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Stack>
          </Card>

          {editing && <FbrInvoicePanel invoiceNo={invoiceNo} refreshKey={fbrRefresh} />}
        </Grid>

      </Grid>
    </Container>
  );
}

ClientInvoiceFormView.propTypes = {
  invoiceNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
