# 🚀 CASfolio - Your Ultimate CAS Portfolio Solution

<div align="center">
  
[![GitHub stars](https://img.shields.io/github/stars/EsElCamii/CASfolio?style=for-the-badge&color=FFD700)](https://github.com/EsElCamii/CASfolio/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/EsElCamii/CASfolio?style=for-the-badge&color=4169E1)](https://github.com/EsElCamii/CASfolio/network)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

✨ **A beautiful, interactive portfolio for tracking and showcasing your CAS (Creativity, Activity, Service) journey** ✨

[![Demo](https://img.shields.io/badge/View-Demo-FF6B6B?style=for-the-badge&logo=vercel&logoColor=white)](https://eselcamii.github.io/CASfolio)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy%20with-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEsElCamii%2FCASfolio)

</div>

## 🌟 Features

<div align="center">

| 🎨 Beautiful UI | 📱 Responsive Design | 📊 Progress Tracking |
|-----------------|----------------------|----------------------|
| Modern, clean interface with smooth animations | Works perfectly on all devices | Track your CAS hours and achievements |

| 📅 Activity Timeline | 🖼️ Media Gallery | 📝 Reflections |
|---------------------|-------------------|----------------|
| Visual timeline of your CAS journey | Showcase your experiences with images | Document your learning and growth |

</div>

## 🛠️ Tech Stack

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=flat-square&logo=github&logoColor=white)

</div>

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/EsElCamii/CASfolio.git
   cd CASfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the local development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000) in your browser to explore the portfolio experience.

## 🧭 Applying CASfolio to Your Own Project

Follow these steps to adapt the platform to your Supabase-backed CAS portfolio.

### 1. Prepare Supabase

1. Create a new Supabase project (or choose an existing one).
2. Configure storage buckets for hero headers and activity assets. CASfolio expects:
   - A bucket for hero images (`SUPABASE_HERO_BUCKET`).
   - A bucket for activity media (`SUPABASE_ACTIVITY_BUCKET`).
3. Apply the SQL migration in `supabase/migrations/20251001090000_legacy_migration_runner.sql` using the Supabase SQL editor or CLI to provision tables (`activities`, `activity_assets`, `user_migrations`, etc.), functions, and policies.

### 2. Configure environment variables

1. Duplicate `.env.local.example` and rename it to `.env.local`.
2. Fill in your Supabase credentials and runtime options:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_HERO_BUCKET=hero-bucket-name
   SUPABASE_ACTIVITY_BUCKET=activity-bucket-name
   NEXT_PUBLIC_HERO_SIGNED_URL_TTL=3600
   ACTIVITY_SIGNED_URL_TTL=3600
   ACTIVITY_MAX_UPLOAD_BYTES=5242880
   ENABLE_LEGACY_MIGRATION=1   # optional – only if you need to migrate legacy data
   ```

### 3. Seed your data

1. Populate `users`, `casfolio_activities`, and `casfolio_activity_assets` with your existing records (CSV import or SQL scripts).
2. Optional: create a minimal hero customization entry in `casfolio_customizations` to hydrate the UI before migration.

### 4. Run the legacy migration (optional)

1. Ensure `ENABLE_LEGACY_MIGRATION` is enabled and the service-role key is present in `.env.local`.
2. Start the dev server (`npm run dev`) or deploy the app with the same environment variables.
3. Invoke `POST /api/migrations/legacy` while authenticated. The route performs:
   - Preflight checks for schema and storage readiness.
   - Bounded, checksummed uploads for Base64 assets.
   - Transactional writes with rollback on failure.
   - Activity regeneration and cleanup of legacy `casfolio_*` tables when complete.

### 5. Build & deploy

1. Build the production bundle: `npm run build`.
2. Deploy to your preferred platform (Vercel, Netlify, custom hosting) with the same environment variables.
3. Monitor Supabase logs and the `user_migrations` table to track migration progress and troubleshoot issues.

## 📸 Screenshots

<div align="center">
  <img src="https://i.ibb.co/chZpgg5K/Screenshot-2025-09-01-at-11-14-21-p-m.png" alt="Dashboard Preview" width="45%">
  <img src="https://i.ibb.co/4wWRy3Q3/Screenshot-2025-09-01-at-11-14-28-p-m.png" alt="Activity Details" width="45%">
</div>

## 📊 Project Structure

```
CASfolio/
├── index.html          # Main HTML file
├── style.css           # Styling
├── script.js           # Main JavaScript functionality
└── README.md           # This file
```

## 🌈 Color Palette

| Color | Hex |
|-------|-----|
| Primary | `#4F46E5` |
| Secondary | `#10B981` |
| Accent | `#F59E0B` |
| Dark | `#1F2937` |
| Light | `#F9FAFB` |

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📬 Contact

Your Name - [@your_twitter](https://twitter.com/your_twitter) - your.email@example.com

Project Link: [https://github.com/EsElCamii/CASfolio](https://github.com/EsElCamii/CASfolio)

## 🙏 Acknowledgments

- [Font Awesome](https://fontawesome.com/)
- [Google Fonts](https://fonts.google.com/)
- [Shields.io](https://shields.io/)

---

<div align="center">
  Made with ❤️ by Your Name | 
  <a href="https://buymeacoffee.com/yourusername">
    <img src="https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" />
  </a>
</div>

<!-- Markdown Preview Enhanced: https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced -->
