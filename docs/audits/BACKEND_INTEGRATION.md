# Backend Integration Guide

## Current Status

The LDO-2 EDMS frontend is now configured to connect to the Django backend API with graceful fallback to mock data.

---

## Quick Start

### 1. Configure Frontend API URL

The frontend looks for `VITE_API_BASE_URL` in `.env`:

```env
# artifacts/edms/.env
VITE_API_BASE_URL=http://localhost:8765/api
VITE_API_TIMEOUT=30000
```

### 2. Start Backend (Django)

```bash
cd backend
python manage.py runserver 0.0.0.0:8765
```

### 3. Start Frontend (React + Vite)

```bash
cd artifacts/edms
pnpm dev
# Opens at http://localhost:5173
```

### 4. Login

Use any of these credentials:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| a.kowalski | ldo2pass | Engineer |
| m.chen | ldo2pass | Reviewer |
| s.patel | ldo2pass | Supervisor |

---

## How Backend Integration Works

### API Client (`src/services/ApiClient.ts`)

Centralized HTTP client with:
- **JWT Authentication** — Auto-adds `Authorization: Bearer {token}` header
- **Request Interceptors** — Injects JWT token from `localStorage`
- **Response Interceptors** — Redirects to login on 401 (token expired)
- **Error Handling** — Extracts error messages from backend responses

### Authentication Flow

1. **Login** → `apiClient.login(username, password)`
   - Calls `POST /api/auth/login/` on backend
   - Backend returns `{ access, refresh, user }`
   - Token stored in `localStorage.auth_token`

2. **Automatic Token Injection** → All requests get `Authorization: Bearer <token>` header

3. **Token Expiry** → 401 response redirects to login page

### Graceful Fallback

If the backend is unavailable, the app falls back to mock data:

```typescript
async getDocuments(filters?: Record<string, any>) {
  try {
    return await this.client.get('/documents/', { params: filters });
  } catch (error) {
    // Fallback to mock if API unavailable
    const { MOCK_DOCUMENTS } = await import('../lib/mock');
    return { results: MOCK_DOCUMENTS, count: MOCK_DOCUMENTS.length };
  }
}
```

**This means:**
- ✅ App works completely offline with mock data
- ✅ API calls automatically use real data when backend is available
- ✅ No UI changes needed — seamless transition

---

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login/` | User login (returns JWT token) |
| POST | `/auth/logout/` | Logout (blacklist token) |
| POST | `/auth/token/refresh/` | Refresh expired token |

### Documents

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/documents/` | List all documents (paginated) |
| POST | `/documents/` | Create new document |
| GET | `/documents/{id}/` | Get document details |
| PATCH | `/documents/{id}/` | Update document |
| DELETE | `/documents/{id}/` | Delete document |
| POST | `/documents/{id}/versions/` | Upload new version |

**Query Filters:**
```
GET /api/documents/?status=Approved&ocr_status=Completed&search=valve
```

### Work Records

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/work-records/` | List all work records |
| POST | `/work-records/` | Create new record |
| GET | `/work-records/{id}/` | Get record details |
| PATCH | `/work-records/{id}/` | Update record |
| DELETE | `/work-records/{id}/` | Delete record |

### PL Items

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/pl-items/` | List all PL items |
| POST | `/pl-items/` | Create PL item |
| GET | `/pl-items/{id}/` | Get PL item |
| PATCH | `/pl-items/{id}/` | Update PL item |

### Cases (Discrepancies)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/cases/` | List all cases |
| POST | `/cases/` | Create new case |
| GET | `/cases/{id}/` | Get case details |
| PATCH | `/cases/{id}/` | Update case |
| POST | `/cases/{id}/close/` | Close case with resolution |

### OCR

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/ocr/jobs/` | List OCR jobs |
| POST | `/ocr/jobs/` | Start new OCR job |
| GET | `/ocr/results/{document_id}/` | Get OCR extraction results |

### Approvals

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/approvals/` | List pending approvals |
| POST | `/approvals/{id}/approve/` | Approve request |
| POST | `/approvals/{id}/reject/` | Reject request |

### Search & Audit

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/search/?q=query&scope=DOCUMENTS` | Full-text search |
| GET | `/search/history/` | Get user's search history |
| GET | `/audit/log/?user=admin&severity=Critical&date_from=2024-01-01` | Audit log with filters |

### Dashboard & Health

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/dashboard/stats/` | KPI aggregates (total docs, approvals, etc.) |
| GET | `/health/status/` | System health (DB, services, metrics) |

---

## React Hooks

Use these hooks in components to fetch data:

### useApiGet — GET requests

```typescript
import { useApiGet } from '../hooks/useApi';

function MyComponent() {
  const { data, loading, error, refetch } = useApiGet('/documents/');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {data?.results?.map(doc => (
        <p key={doc.id}>{doc.name}</p>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### useApiMutation — POST/PATCH/DELETE requests

```typescript
import { useApiMutation } from '../hooks/useApi';

function CreateDocument() {
  const { mutate, loading, error } = useApiMutation('post');
  
  const handleCreate = async (formData) => {
    try {
      const result = await mutate('/documents/', formData);
      console.log('Created:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  return <form onSubmit={handleCreate}>...</form>;
}
```

### useDocuments — Convenience hook

```typescript
import { useDocuments } from '../hooks/useApi';

function DocumentHub() {
  const { documents, loading, refetch, createDocument, updateDocument } = useDocuments();
  
  return (
    <>
      {documents?.map(doc => (
        <div key={doc.id}>{doc.name}</div>
      ))}
    </>
  );
}
```

---

## Error Handling

### Automatic Error Extraction

```typescript
import { apiClient } from '../services/ApiClient';

try {
  await apiClient.updateDocument('doc-id', { status: 'Approved' });
} catch (error) {
  // Extract error message
  const message = apiClient.getErrorMessage(error);
  console.error('Failed:', message);
  
  // Extract field-level errors
  const fieldErrors = apiClient.getFieldErrors(error);
  console.error('Validation:', fieldErrors);
}
```

### Common HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Use response data |
| 201 | Created | New resource created |
| 400 | Bad Request | Validation error — check field errors |
| 401 | Unauthorized | Token expired/invalid — redirect to login |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Backend error — check server logs |

---

## Development Workflow

### Making API Calls

1. **Import the client:**
   ```typescript
   import apiClient from '../services/ApiClient';
   ```

2. **Or use a hook:**
   ```typescript
   import { useApiGet, useApiMutation } from '../hooks/useApi';
   ```

3. **Call the API:**
   ```typescript
   const documents = await apiClient.getDocuments({ status: 'Approved' });
   ```

### Adding New Endpoints

1. **Add to `ApiClient.ts`:**
   ```typescript
   async getMyResource(filters?: Record<string, any>) {
     const response = await this.client.get('/my-resource/', { params: filters });
     return response.data;
   }
   ```

2. **Use in component:**
   ```typescript
   const data = await apiClient.getMyResource();
   ```

### Testing Without Backend

The app continues to work without a backend server — it automatically falls back to mock data. This is useful for:
- ✅ Local development before backend is ready
- ✅ UI testing with predictable data
- ✅ Offline demo mode

---

## Troubleshooting

### API Calls Failing with CORS Error

**Problem:** `Access to XMLHttpRequest at 'http://localhost:8765/api/...' from origin 'http://localhost:5173' has been blocked by CORS policy`

**Solution:** Ensure backend has CORS middleware configured:
```python
# backend/edms/settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
]
```

### Token Not Being Sent

**Problem:** API returns 401 Unauthorized, but you're logged in

**Solution:** Check browser DevTools → Application → LocalStorage → `auth_token` exists

### Fallback to Mock Data Instead of Real API

**Problem:** App always uses mock data even with backend running

**Cause:** Backend URL incorrect or server not responding

**Fix:**
```bash
# Verify backend is running
curl http://localhost:8765/api/health/status/

# Check frontend .env
cat artifacts/edms/.env | grep VITE_API_BASE_URL

# Check browser console for errors
# (F12 → Console tab)
```

### Login Not Working

**Problem:** Login always fails with "Invalid credentials"

**Check:**
1. Backend is running: `curl http://localhost:8765/api/auth/login/ -X POST`
2. User exists in backend database
3. Backend is using the same credentials as the frontend expects

---

## Production Deployment

For production:

1. **Update frontend .env:**
   ```env
   VITE_API_BASE_URL=https://edms.example.com/api
   ```

2. **Rebuild frontend:**
   ```bash
   pnpm build
   # Output: dist/ folder
   ```

3. **Deploy to IIS/Nginx** (see `DEPLOYMENT.md`)

4. **Verify API calls:**
   ```bash
   curl https://edms.example.com/api/health/status/
   ```

---

## API Response Format

All endpoints return JSON in this format:

### Success
```json
{
  "id": "DOC-2024-001",
  "name": "Valve Assembly",
  "status": "Approved",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### List Response
```json
{
  "count": 42,
  "next": "http://localhost:8765/api/documents/?page=2",
  "previous": null,
  "results": [
    { "id": "DOC-001", "name": "..." },
    { "id": "DOC-002", "name": "..." }
  ]
}
```

### Error
```json
{
  "detail": "Invalid credentials"
}
```

---

## Next Steps

1. ✅ Frontend configured with API client
2. ⏳ Backend models and serializers created
3. ⏳ Backend endpoints ready (in `backend/edms_api/`)
4. ⏳ Test integration (login, create document, etc.)
5. ⏳ Performance tuning (pagination, caching)
6. ⏳ Deployment (Windows LAN or Linux)

**To test integration:**
```bash
# Terminal 1: Start backend
cd backend
python manage.py runserver 0.0.0.0:8765

# Terminal 2: Start frontend
cd artifacts/edms
pnpm dev

# Terminal 3: Test API
curl http://localhost:8765/api/health/status/
```

---

**Support:** See `DEPLOYMENT.md` for deployment questions or check Django/DRF documentation for API details.
