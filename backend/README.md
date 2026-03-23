# iReserve CMS Deployment Notes

## Render Deployment Checklist

### Backend
- Set up a new Web Service on Render, connect to your GitHub repo.
- Use the following environment variables (see .env.example):
  - MONGO_URI (from MongoDB Atlas)
  - JWT_SECRET
  - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
  - FRONTEND_URL (your deployed frontend URL)
  - BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER, BREVO_SMTP_PASS
  - MAIL_FROM, MAIL_PROVIDER, BOOKING_BUFFER_MINUTES, PORT
- Start command: `npm start`

### Frontend
- Set up a new Static Site on Render, connect to your GitHub repo.
- Set environment variable VITE_API_BASE_URL to your backend Render URL + `/api`
- Build command: `npm run build`
- Publish directory: `dist`

### MongoDB Atlas
- Create a cluster and get your connection string for MONGO_URI.

---

## Local Development
- Copy `.env.example` to `.env` in both backend and frontend, fill in values.
- Start backend: `npm run dev`
- Start frontend: `npm run dev`

---

## Notes
- CORS is configured to allow only the frontend URL in production.
- API URLs are set via environment variables for flexibility.
