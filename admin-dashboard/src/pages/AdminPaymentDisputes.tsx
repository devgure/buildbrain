import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Button,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import axios from 'axios';

interface DisputeEvidence {
  documentId: string;
  documentName: string;
  uploadedAt: Date;
  type: string;
}

interface Dispute {
  id: string;
  paymentId: string;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: string;
  respondentId: string;
  respondentName: string;
  respondentRole: string;
  amount: number;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'MEDIATION' | 'RESOLVED' | 'CLOSED';
  resolution?: 'REFUNDED' | 'DENIED' | 'MEDIATED' | 'SPLIT_PAYMENT';
  createdAt: Date;
  updatedAt: Date;
  evidence: DisputeEvidence[];
  resolution_note?: string;
}

interface AdminPaymentDisputesProps {
  baseUrl?: string;
}

const AdminPaymentDisputes: React.FC<AdminPaymentDisputesProps> = ({
  baseUrl = 'http://localhost:3000/api/v1',
}) => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'all'>('OPEN');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [resolution, setResolution] = useState<'REFUNDED' | 'DENIED' | 'MEDIATED' | 'SPLIT_PAYMENT'>('DENIED');
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const url =
        filter === 'all'
          ? `${baseUrl}/admin/payments/disputes`
          : `${baseUrl}/admin/payments/disputes?status=${filter}`;

      const response = await axios.get(url);
      setDisputes(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;

    try {
      await axios.patch(`${baseUrl}/admin/payments/disputes/${selectedDispute.id}/resolve`, {
        resolution,
        resolution_note: resolutionNote,
      });
      fetchDisputes();
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'error';
      case 'UNDER_REVIEW':
        return 'warning';
      case 'RESOLVED':
        return 'success';
      case 'CLOSED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getResolutionColor = (resolution?: string) => {
    switch (resolution) {
      case 'REFUNDED':
        return 'error';
      case 'DENIED':
        return 'success';
      case 'MEDIATED':
        return 'warning';
      case 'SPLIT_PAYMENT':
        return 'info';
      default:
        return 'default';
    }
  };

  const openCount = disputes.filter(d => d.status === 'OPEN').length;
  const underReviewCount = disputes.filter(d => d.status === 'UNDER_REVIEW').length;
  const resolvedCount = disputes.filter(d => d.status === 'RESOLVED').length;
  const totalDisputeAmount = disputes.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="admin-disputes-container">
      <h2>Payment Disputes & Resolution</h2>

      {/* Stats */}
      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
                {openCount}
              </div>
              <div style={{ color: '#666' }}>Open Disputes</div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                {underReviewCount}
              </div>
              <div style={{ color: '#666' }}>Under Review</div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
                {resolvedCount}
              </div>
              <div style={{ color: '#666' }}>Resolved</div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                ${totalDisputeAmount.toLocaleString()}
              </div>
              <div style={{ color: '#666' }}>Total Disputed Amount</div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'all'] as const).map(status => (
          <Button
            key={status}
            variant={filter === status ? 'contained' : 'outlined'}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Disputes Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead style={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>Initiator</TableCell>
              <TableCell>Respondent</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Resolution</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {disputes.map(dispute => (
              <TableRow key={dispute.id}>
                <TableCell>
                  <div>{dispute.initiatorName}</div>
                  <small style={{ color: '#666' }}>{dispute.initiatorRole}</small>
                </TableCell>
                <TableCell>
                  <div>{dispute.respondentName}</div>
                  <small style={{ color: '#666' }}>{dispute.respondentRole}</small>
                </TableCell>
                <TableCell>
                  <strong>${dispute.amount.toLocaleString()}</strong>
                </TableCell>
                <TableCell>{dispute.reason}</TableCell>
                <TableCell>
                  <Chip label={dispute.status} color={getStatusColor(dispute.status) as any} size="small" />
                </TableCell>
                <TableCell>
                  {dispute.resolution ? (
                    <Chip
                      label={dispute.resolution}
                      color={getResolutionColor(dispute.resolution) as any}
                      size="small"
                    />
                  ) : (
                    <span style={{ color: '#999' }}>—</span>
                  )}
                </TableCell>
                <TableCell>{new Date(dispute.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {dispute.status !== 'CLOSED' && (
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setOpenDialog(true);
                        setResolution('DENIED');
                        setResolutionNote('');
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        {selectedDispute && (
          <div style={{ padding: '20px' }}>
            <h3>Dispute Resolution Review</h3>

            {/* Timeline */}
            <div style={{ marginBottom: '20px', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
              <strong>Timeline</strong>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <div>Created: {new Date(selectedDispute.createdAt).toLocaleString()}</div>
                <div>Last Updated: {new Date(selectedDispute.updatedAt).toLocaleString()}</div>
                <div style={{ marginTop: '10px', color: '#666' }}>
                  {Math.ceil((new Date(selectedDispute.updatedAt).getTime() - new Date(selectedDispute.createdAt).getTime()) / (1000 * 60 * 60))} hours open
                </div>
              </div>
            </div>

            {/* Parties */}
            <Grid container spacing={2} style={{ marginBottom: '20px' }}>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <strong>Initiator (Complainant)</strong>
                    <div>{selectedDispute.initiatorName}</div>
                    <small>{selectedDispute.initiatorRole}</small>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <strong>Respondent</strong>
                    <div>{selectedDispute.respondentName}</div>
                    <small>{selectedDispute.respondentRole}</small>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Details */}
            <div style={{ marginBottom: '20px' }}>
              <strong>Dispute Details</strong>
              <p><strong>Amount:</strong> ${selectedDispute.amount.toLocaleString()}</p>
              <p><strong>Reason:</strong> {selectedDispute.reason}</p>
            </div>

            {/* Evidence */}
            {selectedDispute.evidence.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <strong>Evidence Provided ({selectedDispute.evidence.length} documents)</strong>
                <div style={{ marginTop: '10px' }}>
                  {selectedDispute.evidence.map((doc, i) => (
                    <div key={i} style={{ marginBottom: '10px', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                      <div>{doc.documentName}</div>
                      <small style={{ color: '#666' }}>
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Options */}
            <div style={{ marginBottom: '20px' }}>
              <FormControl fullWidth style={{ marginBottom: '15px' }}>
                <InputLabel>Resolution Type</InputLabel>
                <Select
                  value={resolution}
                  label="Resolution Type"
                  onChange={e => setResolution(e.target.value as any)}
                >
                  <MenuItem value="DENIED">
                    Deny Dispute (Keep Original Payment)
                  </MenuItem>
                  <MenuItem value="REFUNDED">
                    Issue Refund (100% to Initiator)
                  </MenuItem>
                  <MenuItem value="MEDIATED">
                    Mediate Case (Mark for Human Review)
                  </MenuItem>
                  <MenuItem value="SPLIT_PAYMENT">
                    Split Payment (50/50)
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Resolution Notes"
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                fullWidth
                multiline
                rows={3}
                placeholder="Document reasoning for resolution..."
              />
            </div>

            {/* Resolution Preview */}
            <div style={{ marginBottom: '20px', backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '4px' }}>
              <strong>Resolution Preview</strong>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                {resolution === 'DENIED' && (
                  <div>
                    <div>✓ {selectedDispute.respondentName}: Keep ${selectedDispute.amount.toLocaleString()}</div>
                    <div>✗ {selectedDispute.initiatorName}: No refund</div>
                  </div>
                )}
                {resolution === 'REFUNDED' && (
                  <div>
                    <div>✓ {selectedDispute.initiatorName}: Refund ${selectedDispute.amount.toLocaleString()}</div>
                    <div>✗ {selectedDispute.respondentName}: Payment reversed</div>
                  </div>
                )}
                {resolution === 'MEDIATED' && (
                  <div>
                    <div>⚖ Case escalated to human mediation team</div>
                    <div>Both parties notified of mediation process</div>
                  </div>
                )}
                {resolution === 'SPLIT_PAYMENT' && (
                  <div>
                    <div>✓ {selectedDispute.initiatorName}: Refund ${(selectedDispute.amount / 2).toLocaleString()}</div>
                    <div>✓ {selectedDispute.respondentName}: Keep ${(selectedDispute.amount / 2).toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleResolveDispute}
              >
                Confirm Resolution
              </Button>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default AdminPaymentDisputes;
