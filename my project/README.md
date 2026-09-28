# LDRP-ITR Achievement Portal

Role-based achievement portal (student / alumni / mentor / admin).
Frontend: plain HTML + CSS + JS. Backend: PHP 8 + MySQL (PDO). No build step.

## Run it with XAMPP (Windows / macOS / Linux)

1. Copy this whole folder into XAMPP's web root so it is reachable as
   `http://localhost/ldrp-achievement-portal/`
   (`C:\xampp\htdocs\ldrp-achievement-portal` on Windows, `/Applications/XAMPP/htdocs/...` on macOS).
2. Start **Apache** and **MySQL** in the XAMPP control panel.
3. Open http://localhost/phpmyadmin -> **Import** -> choose
   `backend/database/ldrp_achievement.sql` -> **Go**.
   (This creates the `ldrp_achievement` database, tables and demo data.)
4. Open http://localhost/ldrp-achievement-portal/ and sign in.

If your MySQL root user has a password, or MySQL is on another port, edit
`backend/config/database.php`.

## Run it without XAMPP (PHP built-in server)

```bash
mysql -u root < backend/database/ldrp_achievement.sql
php -S localhost:8000          # run from this folder
# open http://localhost:8000
```
Requires PHP 8+ with the `pdo_mysql` and `fileinfo` extensions.

## Demo logins

| Role    | Email              | Password     |
|---------|--------------------|--------------|
| Admin   | admin@ldrp.edu     | Admin@123    |
| Mentor  | mentor@ldrp.edu    | Mentor@123   |
| Student | student@ldrp.edu   | Student@123  |
| Alumni  | alumni@ldrp.edu    | Alumni@123   |

Public sign-up creates **student** or **alumni** accounts only. Mentors and admins
are created directly in the database (change the demo passwords before real use).

## How it works

* Students/alumni submit achievements (optional PDF/JPG/PNG certificate, max 5 MB) -> status `pending`.
* A mentor reviews achievements of their **assigned** students; approving awards 0-1000 points,
  rejecting requires a reason. Admins can review anything.
* Admins manage users (block/unblock), see all achievements, and choose which approved
  achievements are **featured** on the public homepage. Homepage also shows a points leaderboard.

## Project structure

```
index.html                     single-page UI (public site + dashboards)
css/style.css                  all styles
js/app.js                      all frontend logic (calls the API below)
backend/
  config/database.php          DB connection settings
  config/bootstrap.php         sessions, JSON helpers, auth guards, upload handling
  database/ldrp_achievement.sql  schema + demo data
  uploads/certificates/        uploaded certificates (script execution disabled)
  api/
    auth/         login, register, logout, me
    categories/   list
    achievements/ list (public), create, my-achievements, review-queue,
                  update-status, toggle-featured
    dashboard/    stats
    users/        list, profile, update-status
    mentor/       assign            (admin; no UI yet - use API/DB)
    admin/        achievements, categories/create, categories/delete
```

## Notes

* Assign a mentor to a student (admin): `POST backend/api/mentor/assign.php`
  with JSON `{"mentor_id": 2, "student_id": 8}`, or insert into `mentor_assignments`.
* New students only appear in a mentor's queue once assigned to that mentor
  (admins see every pending achievement).
