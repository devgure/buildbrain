import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  TextField,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Input,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  kycStatus: string;
  kycTier: string;
  rating: number;
  verified: boolean;
  createdAt: Date;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
}

interface AdminUsersProps {
  baseUrl?: string;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ baseUrl = 'http://localhost:3000/api/v1' }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterKycStatus, setFilterKycStatus] = useState('');
  const [actionReason, setActionReason] = useState('');

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, [filterRole, filterKycStatus]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole) params.append('role', filterRole);
      if (filterKycStatus) params.append('kycStatus', filterKycStatus);

      const response = await axios.get(`${baseUrl}/admin/users?${params.toString()}`);
      setUsers(response.data.items || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setOpenDialog(true);
  };

  const handleSuspendUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;

    try {
      await axios.patch(`${baseUrl}/admin/users/${userId}/suspend`, {
        reason: actionReason || 'Administrative action',
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to BAN this user? This is permanent!')) return;

    try {
      await axios.patch(`${baseUrl}/admin/users/${userId}/ban`, {
        reason: actionReason || 'Terms of service violation',
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await axios.patch(`${baseUrl}/admin/users/${userId}/unban`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to unban user:', error);
    }
  };

  const handleApproveKYC = async (userId: string) => {
    try {
      await axios.patch(`${baseUrl}/admin/compliance/kyc/${userId}/approve`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to approve KYC:', error);
    }
  };

  const handleRejectKYC = async (userId: string) => {
    try {
      await axios.patch(`${baseUrl}/admin/compliance/kyc/${userId}/reject`, {
        reason: actionReason || 'Failed verification',
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to reject KYC:', error);
    }
  };

  const filteredUsers = users.filter(
    user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'SUSPENDED': return 'warning';
      case 'BANNED': return 'error';
      default: return 'default';
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'info';
      case 'REJECTED': return 'error';
      case 'MANUAL_REVIEW': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="admin-users-container">
      <h2>User Management</h2>

      <div className="filters" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <TextField
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          size="small"
          style={{ flex: 1 }}
        />
        <Select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          displayEmpty
          size="small"
          style={{ minWidth: '150px' }}
        >
          <MenuItem value="">All Roles</MenuItem>
          <MenuItem value="GC">Contractors</MenuItem>
          <MenuItem value="WORKER">Workers</MenuItem>
          <MenuItem value="ADMIN">Admins</MenuItem>
        </Select>
        <Select
          value={filterKycStatus}
          onChange={e => setFilterKycStatus(e.target.value)}
          displayEmpty
          size="small"
          style={{ minWidth: '150px' }}
        >
          <MenuItem value="">All KYC Status</MenuItem>
          <MenuItem value="APPROVED">Approved</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
        </Select>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead style={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>KYC Status</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Chip
                    label={user.kycStatus}
                    color={getKycStatusColor(user.kycStatus)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    color={getStatusColor(user.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.rating?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Tooltip title="View">
                    <IconButton size="small" onClick={() => handleViewUser(user)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {user.status === 'BANNED' ? (
                    <Button
                      size="small"
                      color="success"
                      onClick={() => handleUnbanUser(user.id)}
                    >
                      Unban
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleBanUser(user.id)}
                    >
                      Ban
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* User Detail Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        {selectedUser && (
          <div style={{ padding: '20px' }}>
            <h3>{selectedUser.name}</h3>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Role:</strong> {selectedUser.role}</p>
            <p><strong>KYC Tier:</strong> {selectedUser.kycTier}</p>
            <p><strong>KYC Status:</strong> {selectedUser.kycStatus}</p>
            <p><strong>Rating:</strong> {selectedUser.rating?.toFixed(2) || 'N/A'}</p>
            <p><strong>Verified:</strong> {selectedUser.verified ? 'Yes' : 'No'}</p>
            <p><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>

            <TextField
              label="Reason (for actions)"
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              {selectedUser.kycStatus === 'PENDING' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => {
                      handleApproveKYC(selectedUser.id);
                      setOpenDialog(false);
                    }}
                  >
                    Approve KYC
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => {
                      handleRejectKYC(selectedUser.id);
                      setOpenDialog(false);
                    }}
                  >
                    Reject KYC
                  </Button>
                </>
              )}
              <Button onClick={() => setOpenDialog(false)}>Close</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default AdminUsers;
