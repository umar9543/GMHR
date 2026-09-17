import * as Yup from 'yup';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { Get, Post, Put } from 'src/api/apibasemethods';

import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSnackbar } from 'src/components/snackbar';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

const TABLE_HEAD = [
  { id: 'location', label: 'Location', minWidth: 180 },
  { id: 'code', label: 'Location Code', minWidth: 140 },
  { id: 'orgName', label: 'Organization', minWidth: 180 },
  { id: 'phone', label: 'Phone', minWidth: 140 },
  { id: 'city', label: 'City', minWidth: 160 },
  { id: 'country', label: 'Country', minWidth: 160 },
  { id: '', label: 'Actions', width: 88, align: 'center' },
];

const defaultFilters = {
  name: '',
};

const LocationSchema = Yup.object().shape({
  location: Yup.string().required('Location is required').min(2).max(100),
  code: Yup.string().required('Location Code is required').max(50),
  orgName: Yup.string().required('Organization is required').min(2).max(100),
  phone: Yup.string().required('Phone is required').max(50),
  city: Yup.string().required('City is required').max(100),
  country: Yup.string().required('Country is required').max(100),
});

const getLocationId = (row) => row?.id || row?.ID || row?.locationId || row?.LocationID;
const getLocationName = (row) =>
  row?.location || row?.LOCATION || row?.name || row?.LocationName || '';
const getLocationCode = (row) => row?.code || row?.CODE || row?.LocationCode || '';
const getOrgName = (row) =>
  row?.orgName || row?.ORGNAME || row?.organization || row?.Organization || '';
const getPhone = (row) => row?.phone || row?.PHONE || '';
const getCityName = (row) => row?.city || row?.CITY || row?.cityName || row?.CityName || '';
const getCountryName = (row) =>
  row?.country || row?.COUNTRY || row?.countryName || row?.CountryName || '';

export default function LocationListView() {
  const table = useTable();
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [filters, setFilters] = useState(defaultFilters);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentRowData, setCurrentRowData] = useState(null);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await Get('https://localhost:7034/api/Location');
      const data = response.data;
      setTableData(Array.isArray(data) ? data : data?.Data || []);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error?.response?.data?.Message || 'Failed to fetch locations', {
        variant: 'error',
      });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchLocations();
      setLoading(false);
    };
    fetchData();
  }, [fetchLocations]);

  const handleDialogClose = () => {
    setDialogOpen(false);
    fetchLocations();
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setCurrentRowData(null);
    fetchLocations();
  };

  const handleFilters = useCallback(
    (name, value) => {
      table.onResetPage();
      setFilters((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    },
    [table]
  );

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters,
  });

  const denseHeight = table.dense ? 56 : 76;
  const canReset = !isEqual(defaultFilters, filters);
  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  if (isLoading) {
    return <LoadingScreen sx={{ height: '70vh' }} />;
  }

  return (
    <>
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Location"
          links={[
            { name: 'Home', href: paths.dashboard.root },
            { name: 'Location', href: paths.dashboard.HR_Module.Setup.location },
            { name: 'List' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setDialogOpen(true)}
              color='primary'
            >
              Add Location
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <Stack spacing={2} sx={{ p: 2.5 }}>
            <TextField
              fullWidth
              value={filters.name}
              onChange={(event) => handleFilters('name', event.target.value)}
              placeholder="Search location, code, organization, phone, city or country..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            {canReset && (
              <Button
                color="error"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={handleResetFilters}
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear
              </Button>
            )}
          </Stack>

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 980 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  onSort={table.onSort}
                />

                <TableBody>
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <LocationTableRow
                        key={
                          getLocationId(row) ||
                          `${getLocationName(row)}-${getLocationCode(row)}-${getCityName(row)}`
                        }
                        row={row}
                        onEditRow={() => {
                          setCurrentRowData(row);
                          setEditDialogOpen(true);
                        }}
                      />
                    ))}

                  <TableEmptyRows
                    height={denseHeight}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePaginationCustom
            count={dataFiltered.length}
            page={table.page}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            dense={table.dense}
            onChangeDense={table.onChangeDense}
          />
        </Card>
      </Container>

      <LocationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        tableData={tableData}
      />

      <LocationDialog
        edit
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        row={currentRowData}
        tableData={tableData}
      />
    </>
  );
}

function LocationTableRow({ row, onEditRow }) {
  return (
    <TableRow hover>
      <TableCell>{getLocationName(row) || '-'}</TableCell>
      <TableCell>{getLocationCode(row) || '-'}</TableCell>
      <TableCell>{getOrgName(row) || '-'}</TableCell>
      <TableCell>{getPhone(row) || '-'}</TableCell>
      <TableCell>{getCityName(row) || '-'}</TableCell>
      <TableCell>{getCountryName(row) || '-'}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
        <IconButton onClick={onEditRow}>
          <Iconify icon="solar:pen-bold" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

function LocationDialog({ edit = false, open, onClose, row, tableData }) {
  const { enqueueSnackbar } = useSnackbar();

  const defaultValues = useMemo(
    () => ({
      location: getLocationName(row),
      code: getLocationCode(row),
      orgName: getOrgName(row),
      phone: getPhone(row),
      city: getCityName(row),
      country: getCountryName(row),
    }),
    [row]
  );

  const methods = useForm({
    resolver: yupResolver(LocationSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    const normalizedLocation = data.location.trim().toLowerCase();
    const normalizedCode = data.code.trim().toLowerCase();
    const normalizedCity = data.city.trim().toLowerCase();

    const alreadyExists = tableData.some((item) => {
      const sameRow = getLocationId(item) === getLocationId(row);
      return (
        !sameRow &&
        (getLocationCode(item).trim().toLowerCase() === normalizedCode ||
          (getLocationName(item).trim().toLowerCase() === normalizedLocation &&
            getCityName(item).trim().toLowerCase() === normalizedCity))
      );
    });

    if (alreadyExists) {
      enqueueSnackbar('Location or location code already exists', { variant: 'error' });
      return;
    }

    const payload = {
      Location: data.location.trim(),
      Code: data.code.trim(),
      OrgName: data.orgName.trim(),
      Address: "",
      Phone: data.phone.trim(),
      City: data.city.trim(),
      Country: data.country.trim(),
    };

    try {
      const response = edit
        ? await Put(`https://localhost:7034/api/Location/${getLocationId(row)}`, payload)
        : await Post('https://localhost:7034/api/Location', payload);

      enqueueSnackbar(
        response.data?.Message || `Location ${edit ? 'updated' : 'added'} successfully`,
        { variant: 'success' }
      );
      reset();
      onClose();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(
        error?.response?.data?.Message || `Failed to ${edit ? 'update' : 'add'} location`,
        { variant: 'error' }
      );
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontSize: '20px !important' }}>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ flexGrow: 1 }}>
            {edit ? 'Edit Location' : 'Add Location'}
          </Box>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <FormProvider methods={methods} onSubmit={onSubmit}>
          <Box
            rowGap={3}
            columnGap={2}
            display="grid"
            paddingY={3}
            gridTemplateColumns={{ xs: 'repeat(1, 1fr)' }}
          >
            <RHFTextField name="location" label="Location" />
            <RHFTextField name="code" label="Location Code" />
            <RHFTextField name="orgName" label="Organization" />
            <RHFTextField name="phone" label="Phone" />
            <RHFTextField name="city" label="City" />
            <RHFTextField name="country" label="Country" />
          </Box>

          <Stack alignItems="flex-end" sx={{ mt: 3 }}>
            <LoadingButton type="submit" variant="contained" loading={isSubmitting} color='primary'>
              Save
            </LoadingButton>
          </Stack>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function applyFilter({ inputData, comparator, filters }) {
  const { name } = filters;
  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    const searchValue = name.toLowerCase();
    inputData = inputData.filter(
      (row) =>
        getLocationName(row).toLowerCase().includes(searchValue) ||
        getLocationCode(row).toLowerCase().includes(searchValue) ||
        getOrgName(row).toLowerCase().includes(searchValue) ||
        getPhone(row).toLowerCase().includes(searchValue) ||
        getCityName(row).toLowerCase().includes(searchValue) ||
        getCountryName(row).toLowerCase().includes(searchValue)
    );
  }

  return inputData;
}

LocationTableRow.propTypes = {
  row: PropTypes.object,
  onEditRow: PropTypes.func,
};

LocationDialog.propTypes = {
  edit: PropTypes.bool,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  row: PropTypes.object,
  tableData: PropTypes.array,
};
