import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { APP_API } from 'src/config-global';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import FormProvider, { RHFTextField, RHFAutocomplete } from 'src/components/hook-form';

import { getClient, createClient, updateClient, getClientRanks } from 'src/api/hr-client';

const emptyRequirement = () => ({
  rank: '',
  requiredDay: 0,
  requiredNight: 0,
  rate: 0,
  overtimeRate: 0,
});

export default function ClientNewEditView({ id }) {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [ranks, setRanks] = useState([]);

  const methods = useForm({
    defaultValues: {
      name: '',
      group: null,
      contractCode: '',
      contractDate: null,
      activeDate: null,
      expiryDate: null,
      requirements: [emptyRequirement()],
    },
  });
  const { watch, setValue, reset, handleSubmit } = methods;
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'requirements' });

  const requirements = watch('requirements');

  // Groups come from the existing dropdown API; ranks from what clients already use.
  useEffect(() => {
    (async () => {
      try {
        const [groupRes, rankRes] = await Promise.all([
          fetch(`${APP_API}/api/Dropdown/groups`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          getClientRanks().catch(() => []),
        ]);
        setGroups(
          (groupRes || []).map((g) => ({
            id: g.id ?? g.Id ?? g.ID,
            name: g.name ?? g.Name ?? g.NAME ?? '',
          }))
        );
        setRanks(rankRes || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoading(true);
      try {
        const c = await getClient(id);
        reset({
          name: c.name || '',
          group: c.groupId ? { id: c.groupId, name: c.groupName || '' } : null,
          contractCode: c.contractCode || '',
          contractDate: c.contractDate ? new Date(c.contractDate) : null,
          activeDate: c.activeDate ? new Date(c.activeDate) : null,
          expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
          requirements: c.requirements?.length
            ? c.requirements.map((r) => ({
                rank: r.rank || '',
                requiredDay: r.requiredDay ?? 0,
                requiredNight: r.requiredNight ?? 0,
                rate: r.rate ?? 0,
                overtimeRate: r.overtimeRate ?? 0,
              }))
            : [emptyRequirement()],
        });
      } catch (err) {
        enqueueSnackbar(err.message || 'Failed to load client', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const totalDay = (requirements || []).reduce((s, r) => s + (parseInt(r?.requiredDay, 10) || 0), 0);
  const totalNight = (requirements || []).reduce((s, r) => s + (parseInt(r?.requiredNight, 10) || 0), 0);

  const toIsoDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : null);

  const savedLabel = isEdit ? 'Update Client' : 'Create Client';
  const saveButtonLabel = saving ? 'Saving...' : savedLabel;

  const onSubmit = handleSubmit(async (data) => {
    if (!data.name?.trim()) {
      enqueueSnackbar('Client name is required', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: data.name.trim(),
        groupId: data.group?.id ?? null,
        contractCode: data.contractCode?.trim() || null,
        contractDate: toIsoDate(data.contractDate),
        activeDate: toIsoDate(data.activeDate),
        expiryDate: toIsoDate(data.expiryDate),
        requirements: (data.requirements || [])
          .filter((r) => r.rank && String(r.rank).trim())
          .map((r) => ({
            rank: String(r.rank).trim(),
            requiredDay: parseInt(r.requiredDay, 10) || 0,
            requiredNight: parseInt(r.requiredNight, 10) || 0,
            rate: parseFloat(r.rate) || 0,
            overtimeRate: parseFloat(r.overtimeRate) || 0,
          })),
      };

      if (isEdit) {
        await updateClient(id, payload);
        enqueueSnackbar('Client updated', { variant: 'success' });
      } else {
        const res = await createClient(payload);
        enqueueSnackbar(`Client created (code ${res.clientId})`, { variant: 'success' });
      }
      router.push(paths.dashboard.HR_Module.Client.list);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading={isEdit ? `Edit Client ${id}` : 'New Client'}
        links={[
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Clients', href: paths.dashboard.HR_Module.Client.list },
          { name: isEdit ? 'Edit' : 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Card sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <RHFTextField name="name" label="Client name" fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <RHFAutocomplete
                name="group"
                label="Group"
                options={groups}
                getOptionLabel={(o) => o?.name || ''}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <RHFTextField name="contractCode" label="Contract code" fullWidth />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Contract date"
                value={watch('contractDate')}
                onChange={(d) => setValue('contractDate', d)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Active from"
                value={watch('activeDate')}
                onChange={(d) => setValue('activeDate', d)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Expires"
                value={watch('expiryDate')}
                onChange={(d) => setValue('expiryDate', d)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </Card>

        <Card>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 3, pt: 2.5, pb: 1.5 }}
          >
            <Box>
              <Typography variant="subtitle1">Contracted Strength</Typography>
              <Typography variant="body2" color="text.secondary">
                Guards required per rank. These are the REQ figures on the Parade State.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip color="success" label={`${totalDay} day`} />
              <Chip color="info" label={`${totalNight} night`} />
            </Stack>
          </Stack>

          <Divider />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '34%' }}>Rank</TableCell>
                  <TableCell align="center" sx={{ width: '14%' }}>
                    Required Day
                  </TableCell>
                  <TableCell align="center" sx={{ width: '14%' }}>
                    Required Night
                  </TableCell>
                  <TableCell align="right" sx={{ width: '17%' }}>
                    Rate
                  </TableCell>
                  <TableCell align="right" sx={{ width: '17%' }}>
                    Overtime Rate
                  </TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <RHFAutocomplete
                        name={`requirements.${index}.rank`}
                        size="small"
                        placeholder="Select rank..."
                        options={ranks}
                        getOptionLabel={(o) => o || ''}
                        // The rank list is built from the ranks clients already
                        // use, so freeSolo stays - otherwise a genuinely new rank
                        // could never be introduced. forcePopupIcon puts the arrow
                        // back, which freeSolo would otherwise hide, and openOnFocus
                        // shows the full list on click instead of only while typing.
                        freeSolo
                        forcePopupIcon
                        openOnFocus
                        selectOnFocus
                        handleHomeEndKeys
                      />
                    </TableCell>
                    <TableCell align="center">
                      <RHFTextField
                        name={`requirements.${index}.requiredDay`}
                        size="small"
                        type="number"
                        inputProps={{ min: 0, style: { textAlign: 'center' } }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <RHFTextField
                        name={`requirements.${index}.requiredNight`}
                        size="small"
                        type="number"
                        inputProps={{ min: 0, style: { textAlign: 'center' } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <RHFTextField
                        name={`requirements.${index}.rate`}
                        size="small"
                        type="number"
                        inputProps={{ min: 0, style: { textAlign: 'right' } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <RHFTextField
                        name={`requirements.${index}.overtimeRate`}
                        size="small"
                        type="number"
                        inputProps={{ min: 0, style: { textAlign: 'right' } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={fields.length <= 1}
                        onClick={() => remove(index)}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ p: 2 }}>
            <Button
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => append(emptyRequirement())}
            >
              Add rank
            </Button>
          </Box>

          <Divider />

          <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ p: 3 }}>
            <Button onClick={() => router.push(paths.dashboard.HR_Module.Client.list)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saveButtonLabel}
            </Button>
          </Stack>
        </Card>
      </FormProvider>
    </Container>
  );
}

ClientNewEditView.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
