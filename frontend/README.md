# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

# iReserve CMS Frontend Deployment Notes

## Vercel Deployment Checklist
1. **Import Project**: In Vercel, click **Add New...** -> **Project** and select this repository.
2. **Set Root Directory**: In the project settings configuration step, set **Root Directory** to `frontend`.
3. **Framework Preset**: Vercel will automatically detect `Vite`.
4. **Environment Variables**: In Vercel Project Settings -> **Environment Variables**, add:
   - `VITE_API_BASE_URL`: Your backend API URL (e.g., `https://api.yourdomain.com/api` or Render backend URL).
   - `VITE_SOCKET_URL`: (Optional) Your backend root URL for Socket.IO (e.g., `https://api.yourdomain.com`).
   - `VITE_TURNSTILE_SITE_KEY`: (Optional) Your Cloudflare Turnstile public site key.
5. **SPA Routing**: `vercel.json` is configured in `frontend/` to route all page requests to `/index.html` so direct navigation and refreshes work seamlessly.
6. **Backend CORS & Mixed Content**:
   - Ensure your backend CORS configuration allows your Vercel domain (`https://*.vercel.app` or your custom domain) and has `credentials: true`.
   - Your backend URL must use `https://` in production to prevent mixed-content blocking in browsers.

## Render Deployment Checklist
- Set up a new Static Site on Render, connect to your GitHub repo.
- Set Root Directory: `frontend`
- Set environment variable `VITE_API_BASE_URL` to your backend URL + `/api`
- Build command: `npm run build`
- Publish directory: `dist`

## Local Development
- Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your local backend (e.g., `http://localhost:5000/api`)
- Start frontend: `npm run dev`

## Notes
- The frontend uses `VITE_API_BASE_URL` for all API requests.
- Make sure your backend CORS allows the frontend domain.

