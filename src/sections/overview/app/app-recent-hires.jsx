import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { fDate } from 'src/utils/format-time';

import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';

// ----------------------------------------------------------------------

export default function AppRecentHires({ title, subheader, tableData, tableLabels, ...other }) {
  const router = useRouter();

  const moveToView = () => {
    router.push(paths.dashboard.Employee.list);
  };

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />

      <TableContainer sx={{ overflow: 'unset' }}>
        <Scrollbar>
          <Table sx={{ minWidth: 600 }}>
            <TableHeadCustom headLabel={tableLabels} />

            <TableBody>
              {tableData.map((row) => (
                <AppRecentHiresRow key={row.id} row={row} />
              ))}
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 2, textAlign: 'right' }}>
        <Button
          size="small"
          color="inherit"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: -0.5 }} />}
          onClick={moveToView}
        >
          View All Employees
        </Button>
      </Box>
    </Card>
  );
}

AppRecentHires.propTypes = {
  subheader: PropTypes.string,
  tableData: PropTypes.array,
  tableLabels: PropTypes.array,
  title: PropTypes.string,
};

// ----------------------------------------------------------------------

function AppRecentHiresRow({ row }) {
  return (
    <TableRow>
      <TableCell>{row.id}</TableCell>
      
      <TableCell>{row.name}</TableCell>

      <TableCell>{row.joinDate ? fDate(row.joinDate) : '-'}</TableCell>

      <TableCell>
        <Label
          variant="soft"
          color={row.isActive ? 'success' : 'error'}
        >
          {row.isActive ? 'Active' : 'Discharged'}
        </Label>
      </TableCell>
    </TableRow>
  );
}

AppRecentHiresRow.propTypes = {
  row: PropTypes.object,
};
