import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Table, TableBody, TableHead } from '@mui/material';
import { useBoolean } from 'src/hooks/use-boolean';

import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import CustomPopover, { usePopover } from 'src/components/custom-popover';




// ----------------------------------------------------------------------

export default function UserTableRow({
  row,
  selected,
  onEditRow,
  onViewProfile,
  onEditPolicy,
  onSelectRow,
  onDeleteRow,
  updatePrivilege,
  onViewIdCard,
  onViewVerification,
}) {
  const {
    EmployeeName,
    FatherName,
    avatarUrl,
    Address,
    DepartmentName,
    active,
    status,
    Email,
    CellNo,
    Education,
    APSAA,
    NIC,
    Age,
  } = row;

  const confirm = useBoolean();
  const quickEdit = useBoolean();
  const popover = usePopover();
  const collapse = useBoolean();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  // Parse Roledtl if it's a string
  // const Roles = typeof Roles === 'string' ? JSON.parse(Roles) : [];\

  return (
    <>
      <TableRow hover selected={selected}>
        {/* <TableCell padding="checkbox">
          <Checkbox checked={selected} onClick={onSelectRow} />
        </TableCell> */}

        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            alt={EmployeeName}
            src={
              imgError || !avatarUrl || avatarUrl === 'null' || avatarUrl.trim() === ''
                ? '/assets/images/Basic.jpg'
                : avatarUrl
            }
            imgProps={{
              onError: () => setImgError(true)
            }}
            sx={{ mr: 2 }}
          />
          <ListItemText
            primary={EmployeeName}

            primaryTypographyProps={{ typography: 'body2' }}

          />
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{FatherName}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{NIC}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{CellNo}</TableCell>
        <TableCell sx={{ maxWidth: 220 }}>
          <Tooltip title={Address || ''} placement="top" arrow>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {Address}
            </div>
          </Tooltip>
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {DepartmentName || 'No Role Assigned'}
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{Age}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{APSAA}</TableCell>
        {/* <TableCell>
          <Label
            variant="soft"
            color={
              (status === 'Registered' && 'success') ||
              (status === 'pending' && 'warning') ||
              (status === 'NotRegistered' && 'error') ||
              'default'
            }
          >
            {status === 'NotRegistered' ? 'Not Registered' : status}
          </Label>
        </TableCell> */}

        <TableCell>
          <Label
            variant="soft"
            color={
              (active === 'Active' && 'success') ||
              (active === 'pending' && 'warning') ||
              (active === 'In-Active' && 'error') ||
              'default'
            }
          >
            {active}
          </Label>
        </TableCell>
        {/* <TableCell align="center" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <IconButton onClick={() => onEditPolicy()}>
            <Iconify icon="hugeicons:policy" />
          </IconButton>
        </TableCell> */}
        <TableCell align="center" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <IconButton onClick={onViewVerification}>
            <Iconify icon="solar:document-bold-duotone" />
          </IconButton>
        </TableCell>
        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>


          <IconButton onClick={onViewIdCard}>
            <Iconify icon="solar:user-id-bold-duotone" />
          </IconButton>
          <IconButton onClick={() => onEditRow()}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        </TableCell>
      </TableRow>

      {/* <TableRow>
        <TableCell sx={{ p: 0, border: 'none', backgroundColor: '#f5f5f5' }} colSpan={9}>
          <Collapse in={collapse.value} timeout="auto" unmountOnExit>
            <Stack component={Paper} sx={{ m: 1.5 }}>
              <Typography variant="h6" sx={{ p: 1 }}>
                User Privilege
              </Typography>
              <Table>
                {Roles.length > 0 ? (
                  <>
                    <TableHead>
                      <TableRow>
                        <TableCell>Form Name</TableCell>
                        <TableCell align="center">Can View</TableCell>
                        <TableCell align="center">Can Add</TableCell>
                        <TableCell align="center">Can Edit</TableCell>
                        <TableCell align="center">Can Delete</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Roles.map((role) => (
                        <TableRow key={role.RMPrivilegeID}>
                          <TableCell>{role.FormName}</TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={role.Is_View}
                              onChange={(e) =>
                                updatePrivilege({
                                  RMPrivilegeID: role.RMPrivilegeID,
                                  Is_View: e.target.checked,
                                  Is_Add: role.Is_Add,
                                  Is_Edit: role.Is_Edit,
                                  Is_Delete: role.Is_Delete,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={role.Is_Add}
                              onChange={(e) =>
                                updatePrivilege({
                                  RMPrivilegeID: role.RMPrivilegeID,
                                  Is_View: role.Is_View,
                                  Is_Add: e.target.checked,
                                  Is_Edit: role.Is_Edit,
                                  Is_Delete: role.Is_Delete,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={role.Is_Edit}
                              onChange={(e) =>
                                updatePrivilege({
                                  RMPrivilegeID: role.RMPrivilegeID,
                                  Is_View: role.Is_View,
                                  Is_Add: role.Is_Add,
                                  Is_Edit: e.target.checked,
                                  Is_Delete: role.Is_Delete,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={role.Is_Delete}
                              onChange={(e) =>
                                updatePrivilege({
                                  RMPrivilegeID: role.RMPrivilegeID,
                                  Is_View: role.Is_View,
                                  Is_Add: role.Is_Add,
                                  Is_Edit: role.Is_Edit,
                                  Is_Delete: e.target.checked,
                                })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={6}>No role assigned</TableCell>
                  </TableRow>
                )}
              </Table>
            </Stack>
          </Collapse>
        </TableCell>
      </TableRow> */}

      {/* <UserQuickEditForm currentUser={row} open={quickEdit.value} onClose={quickEdit.onFalse} /> */}

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="right-top"
        sx={{ width: 140 }}
      >
        <MenuItem
          onClick={() => {
            confirm.onTrue();
            popover.onClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>

        <MenuItem
          onClick={() => {
            onEditRow();
            popover.onClose();
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete?"
        action={
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}

UserTableRow.propTypes = {
  onDeleteRow: PropTypes.func,
  onViewProfile: PropTypes.func,
  onEditRow: PropTypes.func,
  onEditPolicy: PropTypes.func,
  onSelectRow: PropTypes.func,
  row: PropTypes.object,
  selected: PropTypes.bool,
  updatePrivilege: PropTypes.func,
  onViewIdCard: PropTypes.func,
  onViewVerification: PropTypes.func,
};
