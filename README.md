# MedInternia

<div align="center">

### Empowering Medical Learning, Collaboration & Career Growth

MedInternia is a comprehensive medical education and collaboration platform designed for doctors, interns, medical students, and patients.

**Official GSSoC 2026 Project**

<p align="center">
<img src="https://img.shields.io/github/stars/AnirudhPhophalia/MedInternia?style=for-the-badge" />
<img src="https://img.shields.io/github/forks/AnirudhPhophalia/MedInternia?style=for-the-badge" />
<img src="https://img.shields.io/github/issues/AnirudhPhophalia/MedInternia?style=for-the-badge" />
<img src="https://img.shields.io/badge/GSSoC-2026-orange?style=for-the-badge" />
</p>

</div>


## Vision & Problem Statement

The medical education ecosystem faces challenges such as fragmented job discovery, limited collaborative platforms, and difficult access to mentorship. MedInternia was built to unify these tools, creating an ecosystem where professionals can connect, share knowledge, and advance their careers, ultimately improving healthcare quality through better training.

**Core Solutions:**
* **Case-Based Learning:** Explore, analyze, and review real medical cases with peers.
* **Medical Job Board:** Centralized hub for internships, residencies, and job opportunities.
* **Webinars & Live AMAs:** Direct interaction with experienced professionals.
* **AI-Powered Suggestions & Leaderboards:** Smart learning recommendations and contribution tracking.


## User Centric Approach

| Audience | Benefits Provided |
|----------|-------------------|
| **Medical Students** | Case-based peer learning, mentorship, and certifications |
| **Interns** | Job and residency discovery, skill building |
| **Doctors** | Share expertise, review cases, and host webinars |
| **Contributors & Reviewers**| Clear docs, active maintainers, problem-driven architecture |


## Features

* **Case-Based Learning & Peer Review:** Create, publish, and discuss medical cases with nested comments, threaded replies, and peer rating systems.
* **Badges & Certifications:** Earn participation badges and achievement-based certificates.
* **Medical Job Board:** Browse and apply for medical jobs, internships, and residency opportunities.
* **Webinars & Video Conferencing:** Attend and host interactive sessions secured via [Daily.co](https://daily.co) (WebRTC). Role-based controls currently in progress (see [docs/video-conferencing.md](docs/video-conferencing.md)).
* **AI-Powered Suggestions:** Smart recommendations for discussions and AI-assisted learning.
* **User Profiles & Security:** Personalized dashboards managed via JWT authentication, OTP verification, and protected routes.




## Getting Started

### 1. Setup & Installation
```bash
git clone https://github.com/AnirudhPhophalia/MedInternia.git
cd MedInternia

# Install Backend Dependencies
cd backend && npm install

# Install Frontend Dependencies
cd ../frontend && npm install
```

### 2. Configuration
Create a `.env` file in the `backend/` directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Gmail SMTP Configuration (Requires a 16-char App Password, not account password)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### 3. Start Development Servers
```bash
# Start Backend API (runs on http://localhost:3000/api)
cd backend && npm run dev

# Start Frontend (runs on http://localhost:3001)
cd ../frontend && npm run dev
```


## Contributing

We welcome contributions! To get started:
1. Fork the repository and clone your fork.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: added new feature"`
4. Push and open a Pull Request.

<a href="https://github.com/AnirudhPhophalia/MedInternia/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AnirudhPhophalia/MedInternia" />
</a>


# Project Admins / Maintainers

<table>
<tr>

<td align="center">
<a href="https://github.com/AnirudhPhophalia">
<img src="https://github.com/AnirudhPhophalia.png" width="100px;" alt=""/>
<br />
<sub><b>Anirudh Phophalia</b></sub>
</a>
</td>

<td align="center">
  <a href="https://github.com/Anushka-Verma-CODES">
<img src="https://github.com/Anushka-Verma-CODES.png" width="100px;" alt=""/>
<br />
<sub><b>Anushka Verma</b></sub>
</td>

<td align="center">
<a href="https://github.com/IshwinderKaur8">
<img src="https://github.com/IshwinderKaur8.png" width="100px;" alt=""/>
<br />
<sub><b>Ishwinder Kaur Ahluwalia</b></sub>
</td>

<td align="center">
<a href="https://github.com/bhagya-prog">
<img src="https://github.com/bhagya-prog.png" width="100px;" alt=""/>
<br />
<sub><b>Bhagya Vardhan</b></sub>
</td>

</tr>
</table>



## License & Support

* **License:** Licensed under the MIT License. See [LICENSE](./LICENSE) for details.
* **Security:** See [SECURITY.md](./SECURITY.md) for responsible vulnerability reporting.
* **Support:** See [SUPPORT.md](./SUPPORT.md) for usage help.
* **Contact:** Team Blue Spies — [GitHub Repository](https://github.com/AnirudhPhophalia/MedInternia)

<div align="center">
Made for the Medical Community & Open Source Ecosystem
</div>
