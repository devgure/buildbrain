import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Button,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  TextField,
} from '@mui/material';
import axios from 'axios';

interface KycApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  tier: string;
  riskScore: number;
  submittedAt: Date;
  documents: {
    governmentId: boolean;
    proofOfAddress: boolean;
    businessLicense: boolean;
  };
  flags: string[];
}

interface AdminKycProps {
  baseUrl?: string;
}

const AdminKYC: React.FC<AdminKycProps> = ({ baseUrl = 'http://localhost:3000/api/v1' }) => {
  const [applications, setApplications] = useState<KycApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'all'>('PENDING');
  const [selectedApp, setSelectedApp] = useState<KycApplication | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const url =
        filter === 'all'
          ? `${baseUrl}/admin/compliance/kyc`
          : `${baseUrl}/admin/compliance/kyc?status=${filter}`;

      const response = await axios.get(url);
      setApplications(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch KYC applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;

    try {
      await axios.patch(`${baseUrl}/admin/compliance/kyc/${selectedApp.userId}/approve`, {
        tier: selectedApp.tier === 'TIER_3' ? 'TIER_3' : 'TIER_2',
      });
      fetchApplications();
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;

    try {
      await axios.patch(`${baseUrl}/admin/compliance/kyc/${selectedApp.userId}/reject`, {
        reason: decisionReason,
      });
      fetchApplications();
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!selectedApp) return;

    try {
      await axios.patch(`${baseUrl}/admin/compliance/kyc/${selectedApp.userId}/request-info`, {
        reason: decisionReason,
      });
      fetchApplications();
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to request info:', error);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#4caf50'; // Green
    if (score < 70) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const pendingCount = applications.filter(a => a.status === 'PENDING').length;
  const approvedCount = applications.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;
  const manualReviewCount = applications.filter(a => a.status === 'MANUAL_REVIEW').length;

  return (
    <div className="admin-kyc-container">
      <h2>KYC/AML Review Dashboard</h2>

      {/* Stats */}
      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{pendingCount}</div>
              <div style={{ color: '#666' }}>Pending Review</div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
                {approvedCount}
              </div>
              <div style={{ color: '#666' }}>Approved</div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
                {rejectedCount}
              </div>
              <div style={{ color: '#666' }}>Rejected</div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                {manualReviewCount}
              </div>
              <div style={{ color: '#666' }}>Manual Review</div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {(['PENDING', 'APPROVED', 'REJECTED', 'all'] as const).map(status => (
          <Button
            key={status}
            variant={filter === status ? 'contained' : 'outlined'}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : status}
          </Button>
        ))}
      </div>

      {/* Applications Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead style={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Tier Requested</TableCell>
              <TableCell>Risk Score</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.map(app => (
              <TableRow key={app.id}>
                <TableCell>{app.userEmail}</TableCell>
                <TableCell>{app.userName}</TableCell>
                <TableCell>{app.tier}</TableCell>
                <TableCell>
                  <LinearProgress
                    variant="determinate"
                    value={app.riskScore}
                    style={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#e0e0e0',
                    }}
                  />
                  <small>{app.riskScore}%</small>
                </TableCell>
                <TableCell>
                  <Chip
                    label={app.status}
                    color={
                      app.status === 'APPROVED'
                        ? 'success'
                        : app.status === 'REJECTED'
                          ? 'error'
                          : 'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(app.submittedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {app.documents.governmentId && <span>🪪 </span>}
                  {app.documents.proofOfAddress && <span>📍 </span>}
                  {app.documents.businessLicense && <span>📋 </span>}
                </TableCell>
                <TableCell>
                  {app.status === 'PENDING' && (
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedApp(app);
                        setOpenDialog(true);
                      }}
                    >
                      Review
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Review Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        {selectedApp && (
          <div style={{ padding: '20px' }}>
            <h3>KYC Application Review</h3>
            <p><strong>Applicant:</strong> {selectedApp.userName}</p>
            <p><strong>Email:</strong> {selectedApp.userEmail}</p>
            <p><strong>Tier Requested:</strong> {selectedApp.tier}</p>
            <p><strong>Risk Score:</strong> {selectedApp.riskScore}%</p>

            {selectedApp.flags.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Flags Raised:</strong>
                <ul>
                  {selectedApp.flags.map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            <TextField
              label="Decision Reason/Notes"
              value={decisionReason}
              onChange={e => setDecisionReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <Button
                variant="contained"
                color="success"
                onClick={handleApprove}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button
                variant="outlined"
                onClick={handleRequestMoreInfo}
              >
                Request More Info
              </Button>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default AdminKYC;
