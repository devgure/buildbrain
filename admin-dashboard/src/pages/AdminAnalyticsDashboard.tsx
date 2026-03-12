import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import axios from 'axios';

interface DashboardMetrics {
  revenue: number;
  profitMargin: number;
  activeProjects: number;
  completedProjects: number;
  totalUsers: number;
  newUsers: number;
  avgProjectValue: number;
  paymentStatus: {
    PENDING: number;
    PROCESSING: number;
    COMPLETED: number;
    FAILED: number;
  };
}

interface TrendData {
  date: string;
  value: number;
}

interface FraudAlert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  detected: Date;
  resolved: boolean;
}

interface MarketplaceHealth {
  totalBids: number;
  acceptedBids: number;
  acceptanceRate: number;
  avgBidAmount: number;
  totalPaymentValue: number;
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

interface AdminAnalyticsProps {
  baseUrl?: string;
}

const AdminAnalyticsDashboard: React.FC<AdminAnalyticsProps> = ({
  baseUrl = 'http://localhost:3000/api/v1',
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<TrendData[]>([]);
  const [userGrowthTrend, setUserGrowthTrend] = useState<TrendData[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [marketplaceHealth, setMarketplaceHealth] = useState<MarketplaceHealth | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const params = { startDate: getStartDate(), endDate: new Date().toISOString() };

      const [metricsRes, revenueRes, userRes, healthRes, fraudRes] = await Promise.all([
        axios.get(`${baseUrl}/analytics/dashboard`, { params }),
        axios.get(`${baseUrl}/analytics/revenue-trend`, {
          params: { ...params, groupBy: timeRange },
        }),
        axios.get(`${baseUrl}/analytics/user-growth`, {
          params: { ...params, groupBy: timeRange },
        }),
        axios.get(`${baseUrl}/analytics/marketplace-health`),
        axios.get(`${baseUrl}/analytics/fraud-detection?limit=10`),
      ]);

      setMetrics(metricsRes.data);
      setRevenueTrend(revenueRes.data.data || []);
      setUserGrowthTrend(userRes.data.data || []);
      setMarketplaceHealth(healthRes.data);
      setFraudAlerts(fraudRes.data.items || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        now.setDate(now.getDate() - 1);
        break;
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
    }
    return now.toISOString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return '#4caf50';
      case 'MEDIUM':
        return '#ff9800';
      case 'HIGH':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'HEALTHY':
        return '#4caf50';
      case 'WARNING':
        return '#ff9800';
      case 'CRITICAL':
        return '#f44336';
      default:
        return '#666';
    }
  };

  if (loading || !metrics || !marketplaceHealth) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="admin-analytics-container">
      <h2>Admin Analytics Dashboard</h2>

      {/* Time Range Selector */}
      <div style={{ marginBottom: '20px' }}>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(e, newVal) => setTimeRange(newVal)}
          style={{ marginRight: '10px' }}
        >
          <ToggleButton value="day">Last Day</ToggleButton>
          <ToggleButton value="week">Last Week</ToggleButton>
          <ToggleButton value="month">Last Month</ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Key Metrics */}
      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '18px', color: '#666' }}>Total Revenue</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                ${metrics.revenue.toLocaleString()}
              </div>
              <small style={{ color: '#4caf50' }}>Last {timeRange}</small>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '18px', color: '#666' }}>Profit Margin</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {(metrics.profitMargin * 100).toFixed(1)}%
              </div>
              <small style={{ color: '#999' }}>Platform fee: 10%</small>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '18px', color: '#666' }}>Active Projects</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {metrics.activeProjects}
              </div>
              <small style={{ color: '#666' }}>In progress</small>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '18px', color: '#666' }}>Active Users</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {metrics.totalUsers.toLocaleString()}
              </div>
              <small style={{ color: '#2196f3' }}>+{metrics.newUsers} new</small>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Secondary Metrics */}
      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '16px', color: '#666' }}>Avg Project Value</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                ${metrics.avgProjectValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '16px', color: '#666' }}>Completed Projects</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {metrics.completedProjects}
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <div style={{ fontSize: '16px', color: '#666' }}>Payment Success Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {(
                  (metrics.paymentStatus.COMPLETED /
                    Object.values(metrics.paymentStatus).reduce((a, b) => a + b, 0)) *
                  100
                ).toFixed(1)}
                %
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Marketplace Health */}
      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <h3>💼 Marketplace Health</h3>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Status:</strong>{' '}
                  <Chip
                    label={marketplaceHealth.health}
                    style={{ backgroundColor: getHealthColor(marketplaceHealth.health), color: 'white' }}
                    size="small"
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Total Bids:</strong> {marketplaceHealth.totalBids.toLocaleString()}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Accepted Bids:</strong> {marketplaceHealth.acceptedBids.toLocaleString()}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Acceptance Rate:</strong> {(marketplaceHealth.acceptanceRate * 100).toFixed(1)}%
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Avg Bid Amount:</strong> $
                  {marketplaceHealth.avgBidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div>
                  <strong>Total Payment Value:</strong> $
                  {marketplaceHealth.totalPaymentValue.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Status Distribution */}
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <h3>💳 Payment Status Distribution</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2196f3' }}>
                    {metrics.paymentStatus.PENDING}
                  </div>
                  <small>Pending</small>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff9800' }}>
                    {metrics.paymentStatus.PROCESSING}
                  </div>
                  <small>Processing</small>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4caf50' }}>
                    {metrics.paymentStatus.COMPLETED}
                  </div>
                  <small>Completed</small>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f44336' }}>
                    {metrics.paymentStatus.FAILED}
                  </div>
                  <small>Failed</small>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Fraud Alerts */}
      <Card style={{ marginBottom: '20px' }}>
        <CardContent>
          <h3>🚨 Recent Fraud Alerts</h3>
          {fraudAlerts.length === 0 ? (
            <p style={{ color: '#999' }}>No recent fraud alerts</p>
          ) : (
            <TableContainer>
              <Table>
                <TableHead style={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Detected</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fraudAlerts.map(alert => (
                    <TableRow key={alert.id}>
                      <TableCell>{alert.type}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.severity}
                          size="small"
                          style={{
                            backgroundColor: getSeverityColor(alert.severity),
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell>{alert.description}</TableCell>
                      <TableCell>{new Date(alert.detected).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {alert.resolved ? (
                          <Chip label="Resolved" size="small" variant="outlined" />
                        ) : (
                          <Chip label="Active" size="small" color="error" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue Trend Summary */}
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <h3>📈 Revenue Trend</h3>
              {revenueTrend.length > 0 ? (
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    ${revenueTrend[revenueTrend.length - 1].value.toLocaleString()}
                  </div>
                  <small style={{ color: '#999' }}>Latest {timeRange}</small>
                  <div style={{ marginTop: '10px', height: '100px', backgroundColor: '#f5f5f5' }}>
                    <div style={{ padding: '10px' }}>
                      {revenueTrend.map((point, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#666' }}>
                          {point.date}: ${point.value.toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#999' }}>No data available</p>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card>
            <CardContent>
              <h3>👥 User Growth Trend</h3>
              {userGrowthTrend.length > 0 ? (
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    +{userGrowthTrend[userGrowthTrend.length - 1].value.toLocaleString()} users
                  </div>
                  <small style={{ color: '#999' }}>Latest {timeRange}</small>
                  <div style={{ marginTop: '10px', height: '100px', backgroundColor: '#f5f5f5' }}>
                    <div style={{ padding: '10px' }}>
                      {userGrowthTrend.map((point, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#666' }}>
                          {point.date}: +{point.value.toLocaleString()} new users
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#999' }}>No data available</p>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default AdminAnalyticsDashboard;
