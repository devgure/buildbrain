import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1';

// Test utilities
const withAuth = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

let authToken: string;
let testUserId: string;

describe('BuildBrainOS Integration Tests', () => {
  describe('Authentication', () => {
    test('User can register', async () => {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: `test_${Date.now()}@buildbrain.io`,
        password: 'TestPassword123!',
        role: 'GC',
        companyName: 'Test Construction',
        phone: '+1-415-555-0001',
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data.user).toHaveProperty('id');

      authToken = response.data.accessToken;
      testUserId = response.data.user.id;
    });

    test('User can login', async () => {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@buildbrain.io',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
    });

    test('Invalid password returns 401', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: 'test@buildbrain.io',
          password: 'WrongPassword',
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    test('Refresh token returns new tokens', async () => {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@buildbrain.io',
        password: 'TestPassword123!',
      });

      const refreshResponse = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken: loginResponse.data.refreshToken },
      );

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data).toHaveProperty('accessToken');
    });
  });

  describe('Projects', () => {
    beforeAll(async () => {
      // Login first
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@buildbrain.io',
        password: 'TestPassword123!',
      });
      authToken = response.data.accessToken;
      testUserId = response.data.user.id;
    });

    test('GC can create project', async () => {
      const response = await axios.post(
        `${API_URL}/projects`,
        {
          title: 'Test Project',
          description: 'Test Description',
          budget: 500000,
          location: 'San Francisco',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        },
        withAuth(authToken),
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.title).toBe('Test Project');
    });

    test('Can retrieve project details', async () => {
      // Create project first
      const createResponse = await axios.post(
        `${API_URL}/projects`,
        {
          title: 'Retrievable Project',
          budget: 300000,
          location: 'Oakland',
        },
        withAuth(authToken),
      );

      const projectId = createResponse.data.id;

      // Retrieve it
      const getResponse = await axios.get(
        `${API_URL}/projects/${projectId}`,
        withAuth(authToken),
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.id).toBe(projectId);
    });

    test('Can list projects', async () => {
      const response = await axios.get(
        `${API_URL}/projects`,
        withAuth(authToken),
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Milestones', () => {
    let projectId: string;

    beforeAll(async () => {
      // Create project
      const createResponse = await axios.post(
        `${API_URL}/projects`,
        {
          title: 'Milestone Test Project',
          budget: 600000,
          location: 'San Jose',
        },
        withAuth(authToken),
      );
      projectId = createResponse.data.id;
    });

    test('GC can create milestone', async () => {
      const response = await axios.post(
        `${API_URL}/projects/${projectId}/milestones`,
        {
          title: 'Foundation',
          amount: 200000,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          deliverables: ['Foundation inspection passed', 'Base complete'],
        },
        withAuth(authToken),
      );

      expect(response.status).toBe(201);
      expect(response.data.title).toBe('Foundation');
      expect(response.data.status).toBe('PENDING');
    });

    test('Cannot exceed project budget with milestones', async () => {
      try {
        await axios.post(
          `${API_URL}/projects/${projectId}/milestones`,
          {
            title: 'Over Budget',
            amount: 800000, // Exceeds $600k budget
            dueDate: new Date().toISOString(),
          },
          withAuth(authToken),
        );
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test('Can retrieve milestones', async () => {
      const response = await axios.get(
        `${API_URL}/projects/${projectId}/milestones`,
        withAuth(authToken),
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Payments', () => {
    let paymentProjectId: string;
    let milestoneId: string;
    let recipientUserId: string;

    beforeAll(async () => {
      // Create project
      const createResponse = await axios.post(
        `${API_URL}/projects`,
        {
          title: 'Payment Test Project',
          budget: 500000,
          location: 'Berkeley',
        },
        withAuth(authToken),
      );
      paymentProjectId = createResponse.data.id;

      // Create milestone
      const milestoneResponse = await axios.post(
        `${API_URL}/projects/${paymentProjectId}/milestones`,
        {
          title: 'Framing',
          amount: 250000,
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        withAuth(authToken),
      );
      milestoneId = milestoneResponse.data.id;

      // Create another user to pay
      const registerResponse = await axios.post(`${API_URL}/auth/register`, {
        email: `recipient_${Date.now()}@buildbrain.io`,
        password: 'TestPassword123!',
        role: 'WORKER',
      });
      recipientUserId = registerResponse.data.user.id;
    });

    test('GC can request payment', async () => {
      const response = await axios.post(
        `${API_URL}/payments/request`,
        {
          projectId: paymentProjectId,
          milestoneId,
          recipientId: recipientUserId,
          amount: 250000,
          method: 'INTERNAL_LEDGER',
        },
        withAuth(authToken),
      );

      expect(response.status).toBe(201);
      expect(response.data.status).toBe('PENDING');
    });

    test('Can retrieve payment details', async () => {
      // Request payment
      const createResponse = await axios.post(
        `${API_URL}/payments/request`,
        {
          projectId: paymentProjectId,
          milestoneId,
          recipientId: recipientUserId,
          amount: 100000,
        },
        withAuth(authToken),
      );

      const paymentId = createResponse.data.id;

      // Get details
      const getResponse = await axios.get(
        `${API_URL}/payments/${paymentId}`,
        withAuth(authToken),
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.id).toBe(paymentId);
    });

    test('Can approve payment', async () => {
      // Request
      const createResponse = await axios.post(
        `${API_URL}/payments/request`,
        {
          projectId: paymentProjectId,
          milestoneId,
          recipientId: recipientUserId,
          amount: 75000,
        },
        withAuth(authToken),
      );

      // Approve
      const approveResponse = await axios.patch(
        `${API_URL}/payments/${createResponse.data.id}/approve`,
        {},
        withAuth(authToken),
      );

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.data.status).toBe('COMPLETED');
    });
  });

  describe('Marketplace Jobs', () => {
    test('User can post job', async () => {
      const response = await axios.post(
        `${API_URL}/marketplace/jobs`,
        {
          title: 'Electrical Work Needed',
          description: 'Full electrical installation',
          category: 'ELECTRICAL',
          hourlyRate: 7500,
          location: 'San Francisco',
          requiredSkills: ['electrical_work', 'code_compliance'],
        },
        withAuth(authToken),
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
    });

    test('Worker can search jobs', async () => {
      const response = await axios.get(
        `${API_URL}/marketplace/jobs/search?category=ELECTRICAL&minRate=5000`,
        withAuth(authToken),
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    test('Worker can submit bid', async () => {
      // Post job
      const jobResponse = await axios.post(
        `${API_URL}/marketplace/jobs`,
        {
          title: 'Plumbing Work',
          category: 'PLUMBING',
          totalBudget: 300000,
          location: 'Oakland',
        },
        withAuth(authToken),
      );

      const jobId = jobResponse.data.id;

      // Login as different user
      const workerRegister = await axios.post(`${API_URL}/auth/register`, {
        email: `worker_${Date.now()}@buildbrain.io`,
        password: 'TestPassword123!',
        role: 'WORKER',
      });

      const workerToken = workerRegister.data.accessToken;

      // Submit bid
      const bidResponse = await axios.post(
        `${API_URL}/marketplace/jobs/${jobId}/bids`,
        {
          amount: 280000,
          proposal: 'Expert plumber with 10+ years experience',
        },
        withAuth(workerToken),
      );

      expect(bidResponse.status).toBe(201);
      expect(bidResponse.data.status).toBe('SUBMITTED');
    });
  });

  describe('Wallet', () => {
    test('User has wallet', async () => {
      const response = await axios.get(
        `${API_URL}/payments/wallet/balance`,
        withAuth(authToken),
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('usdBalance');
      expect(response.data).toHaveProperty('kycTierLimit');
    });
  });

  describe('Error Handling', () => {
    test('Invalid endpoint returns 404', async () => {
      try {
        await axios.get(`${API_URL}/invalid-endpoint`, withAuth(authToken));
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    test('Unauthenticated request returns 401', async () => {
      try {
        await axios.get(`${API_URL}/projects`);
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    test('Invalid request body returns 400', async () => {
      try {
        await axios.post(
          `${API_URL}/projects`,
          {
            title: 'Missing Required Fields',
            // Missing budget, location, etc.
          },
          withAuth(authToken),
        );
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
