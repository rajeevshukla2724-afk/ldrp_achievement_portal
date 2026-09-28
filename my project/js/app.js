const API = "backend/api";

let CATEGORIES = [];
let achievements = [];
let currentUser = null;
let pickedRole = "student";
let authMode = "login";

const FALLBACK_CATEGORY_ICONS = {
    Academics: "🎓",
    Sports: "🏆",
    Hackathons: "💻",
    Research: "🔬",
    Placements: "💼",
    Cultural: "🎭"
};

function apiUrl(path) {
    return `${API}/${path}`;
}

async function api(path, options = {}) {
    try {
        const response = await fetch(apiUrl(path), {
            credentials: "include",
            ...options
        });

        const text = await response.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(
                "The server returned an invalid response. Make sure the PHP backend is running."
            );
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(
                "Cannot connect to the backend. Make sure the PHP server is running."
            );
        }

        throw error;
    }
}

async function apiGet(path) {
    return api(path, {
        method: "GET"
    });
}

async function apiPost(path, data) {
    return api(path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function initials(name = "") {
    return String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

function getCategoryName(a) {
    return a.category || a.cat || "Uncategorized";
}

function getDescription(a) {
    return a.description || a.desc || "No description available.";
}

function getDate(a) {
    if (a.achievement_date) {
        const date = new Date(`${a.achievement_date}T00:00:00`);

        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        }
    }

    if (a.date) {
        return a.date;
    }

    if (a.created_at) {
        const date = new Date(a.created_at);

        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        }
    }

    return "-";
}

function getRoleLabel(role) {
    if (role === "alumni") return "Alumni";
    if (role === "student") return "Student";
    if (role === "mentor") return "Mentor";
    if (role === "admin") return "Admin";
    return role || "";
}

function verifiedBadge() {
    return `
        <span class="badge-verified">
            <svg viewBox="0 0 24 24" fill="none">
                <path
                    d="M9 12l2 2 4-4"
                    stroke="#1d7a52"
                    stroke-width="2.4"
                    stroke-linecap="round"
                />
                <circle
                    cx="12"
                    cy="12"
                    r="9.5"
                    stroke="#1d7a52"
                    stroke-width="1.6"
                />
            </svg>
            Verified
        </span>
    `;
}

function achvCard(a) {
    const name = escapeHTML(a.name || "");
    const title = escapeHTML(a.title || "");
    const description = escapeHTML(getDescription(a));
    const category = escapeHTML(getCategoryName(a));
    const department = escapeHTML(
        a.department ||
        a.dept ||
        "LDRP-ITR"
    );
    const role = escapeHTML(getRoleLabel(a.role));
    const date = escapeHTML(getDate(a));
    const organization = escapeHTML(a.organization || "");
    const position = escapeHTML(a.position || "");
    const attachment = String(a.certificate_path || "");

    const attachmentUrl = attachment
        ? `backend/${attachment.replace(/^\/+/, "")}`
        : "";

    const isImage = /\.(jpg|jpeg|png)$/i.test(attachment);

    return `
        <div class="card featured-achievement-card">

            ${isImage ? `
                <a
                    class="featured-photo-wrap"
                    href="${escapeHTML(attachmentUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View achievement photo"
                >
                    <img
                        class="featured-photo"
                        src="${escapeHTML(attachmentUrl)}"
                        alt="Achievement certificate/photo for ${name}"
                        loading="lazy"
                    >
                </a>
            ` : ""}

            <div class="card-top">
                <span class="cat-chip">${category}</span>
                ${a.status === "approved" ? verifiedBadge() : ""}
            </div>

            <h3>${title}</h3>

            <div class="desc">
                ${description}
            </div>

            <div class="featured-details">
                <span>${role}</span>
                <span>${date}</span>
                ${organization ? `<span>${organization}</span>` : ""}
                ${position ? `<span>${position}</span>` : ""}
            </div>

            <div class="card-foot">

                <div class="avatar">
                    ${initials(name)}
                </div>

                <div class="who">
                    <div class="name">${name}</div>
                    <div class="meta">${department}</div>
                </div>

            </div>

        </div>
    `;
}

async function loadCategories() {
    const result = await apiGet("categories/list.php");

    CATEGORIES = (result.data || []).map(category => {
        const name = String(category.name || "").trim();

        return {
            id: Number(category.id),
            n: name,
            ic: FALLBACK_CATEGORY_ICONS[name] || "✦",
            c: Number(category.entries || 0)
        };
    });
}

async function loadPublicAchievements() {
    const result = await apiGet("achievements/list.php");

    achievements = Array.isArray(result.data)
        ? result.data
        : [];
}

function renderStats() {
    const statRow = document.getElementById("statRow");

    if (!statRow) return;

    const approvedCount = achievements.filter(
        a => a.status === "approved"
    ).length;

    const featuredCount = achievements.filter(
        a => Number(a.featured) === 1
    ).length;

    statRow.innerHTML = `
        <div class="stat">
            <div class="num">${approvedCount}</div>
            <div class="lbl">Verified Achievements</div>
        </div>

        <div class="stat">
            <div class="num">${CATEGORIES.length}</div>
            <div class="lbl">Achievement Categories</div>
        </div>

        <div class="stat">
            <div class="num">${featuredCount}</div>
            <div class="lbl">Featured Achievements</div>
        </div>

        <div class="stat">
            <div class="num">LDRP</div>
            <div class="lbl">Institutional Archive</div>
        </div>
    `;
}

function renderCategories() {
    const grid = document.getElementById("catGrid");

    if (!grid) return;

    grid.innerHTML = CATEGORIES.map(category => `
        <div
            class="cat-tile"
            onclick="
                document.getElementById('searchInput').value='';
                document.getElementById('filterCat').value='${category.id}';
                renderFeatured();
                document.getElementById('featured').scrollIntoView({behavior:'smooth'});
            "
        >
            <div class="ic">${category.ic}</div>

            <div class="n">
                ${escapeHTML(category.n)}
            </div>

            <div class="c">
                ${category.c}
                ${Number(category.c) === 1 ? "entry" : "entries"}
            </div>
        </div>
    `).join("");

    const select = document.getElementById("filterCat");

    if (!select) return;

    select.innerHTML = `
        <option value="">All categories</option>
    `;

    CATEGORIES.forEach(category => {
        select.innerHTML += `
            <option value="${category.id}">
                ${escapeHTML(category.n)}
            </option>
        `;
    });
}

function renderFeatured() {
    const searchInput = document.getElementById("searchInput");
    const filterCat = document.getElementById("filterCat");
    const filterType = document.getElementById("filterType");
    const featuredGrid = document.getElementById("featuredGrid");

    if (!featuredGrid) return;

    const search = (
        searchInput?.value || ""
    )
        .trim()
        .toLowerCase();

    const categoryId =
        filterCat?.value || "";

    const type =
        filterType?.value || "";

    const backendRole =
        type === "Student"
            ? "student"
            : type === "Alumni"
                ? "alumni"
                : "";

    const list = achievements.filter(a => {
        const searchableText = [
            a.name,
            a.title,
            a.department,
            a.description,
            a.category
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search ||
            searchableText.includes(search);

        const matchesCategory =
            !categoryId ||
            String(a.category_id) === String(categoryId);

        const matchesType =
            !backendRole ||
            a.role === backendRole;

        return (
            a.status === "approved" &&
            Number(a.featured) === 1 &&
            matchesSearch &&
            matchesCategory &&
            matchesType
        );
    });

    featuredGrid.innerHTML =
        list.length
            ? list.map(achvCard).join("")
            : `
                <p style="color:var(--muted)">
                    No achievements match your search.
                </p>
            `;
}

function renderTop() {
    const topList = document.getElementById("topList");

    if (!topList) return;

    const top = [...achievements]
        .filter(a => a.status === "approved")
        .sort(
            (a, b) =>
                Number(b.points || 0) -
                Number(a.points || 0)
        )
        .slice(0, 5);

    topList.innerHTML = top.length
        ? top.map((a, index) => `
            <div class="top-row">

                <div class="rank">
                    ${String(index + 1).padStart(2, "0")}
                </div>

                <div class="avatar">
                    ${initials(a.name)}
                </div>

                <div class="info">
                    <div class="n">
                        ${escapeHTML(a.name)}
                    </div>

                    <div class="m">
                        ${escapeHTML(
                            a.department ||
                            "LDRP-ITR"
                        )}
                    </div>
                </div>

                <div class="pts">
                    ${Number(a.points || 0)} pts
                </div>

            </div>
        `).join("")
        : `
            <p style="color:#8b92a1">
                No verified achievements yet.
            </p>
        `;
}

function renderRecent() {
    const recentGrid = document.getElementById("recentGrid");

    if (!recentGrid) return;

    const recent = [...achievements]
        .filter(a => a.status === "approved")
        .sort((a, b) => {
            const dateA = new Date(
                a.achievement_date ||
                a.created_at ||
                0
            );

            const dateB = new Date(
                b.achievement_date ||
                b.created_at ||
                0
            );

            return dateB - dateA;
        })
        .slice(0, 3);

    recentGrid.innerHTML =
        recent.length
            ? recent.map(achvCard).join("")
            : `
                <p style="color:var(--muted)">
                    No recent achievements.
                </p>
            `;
}

function renderAlumni() {
    const grid = document.getElementById("alumniGrid");

    if (!grid) return;

    const alumni = achievements.filter(
        a =>
            String(a.role || "").toLowerCase() === "alumni" &&
            a.status === "approved"
    );

    grid.innerHTML = alumni.length
        ? alumni.map(achvCard).join("")
        : `
            <div class="alumni-empty">
                <div class="alumni-empty-icon">✦</div>

                <h3>
                    Alumni achievements are on their way
                </h3>

                <p>
                    Distinguished alumni achievements will appear here
                    as they are verified and published.
                </p>
            </div>
        `;
}

function renderPublic() {
    renderStats();
    renderCategories();
    renderFeatured();
    renderTop();
    renderRecent();
    renderAlumni();
}

async function loadPublic() {
    try {
        await Promise.all([
            loadCategories(),
            loadPublicAchievements()
        ]);

        renderPublic();
    } catch (error) {
        console.error(error);

        const featuredGrid =
            document.getElementById("featuredGrid");

        if (featuredGrid) {
            featuredGrid.innerHTML = `
                <p style="color:#9c3c3c">
                    ${escapeHTML(error.message)}
                </p>
            `;
        }
    }
}

function setupPublicListeners() {
    document
        .getElementById("searchInput")
        ?.addEventListener(
            "input",
            renderFeatured
        );

    document
        .getElementById("filterCat")
        ?.addEventListener(
            "change",
            renderFeatured
        );

    document
        .getElementById("filterType")
        ?.addEventListener(
            "change",
            renderFeatured
        );
}

function openAuth(mode) {
    authMode = mode;

    const authScreen =
        document.getElementById("authScreen");

    if (!authScreen) return;

    authScreen.classList.remove("hide");

    const title =
        document.getElementById("authTitle");

    const sub =
        document.getElementById("authSub");

    if (title) {
        title.textContent =
            mode === "signup"
                ? "Create account"
                : mode === "forgot"
                    ? "Forgot password"
                    : "Sign in";
    }

    if (sub) {
        sub.textContent =
            mode === "signup"
                ? "Join the LDRP-ITR achievement community."
                : mode === "forgot"
                    ? "Enter your registered student or alumni email."
                    : "Access your achievement dashboard.";
    }

    updateAuthFields();
}

function updateAuthFields() {
    const emailInput =
        document.getElementById("authEmail");

    const passwordInput =
        document.getElementById("authPassword");

    const emailField =
        emailInput?.closest(".auth-field");

    const passwordField =
        passwordInput?.closest(".auth-field");

    const originalRoleField =
        document
            .querySelector("#authScreen .role-grid")
            ?.closest(".auth-field");

    const note =
        document.querySelector(".auth-note");

    const submitButton =
        document.querySelector(".auth-submit");

    const forgotLink =
        document.getElementById("forgotPasswordLink");

    if (forgotLink) {
        forgotLink.style.display =
            authMode === "login"
                ? "block"
                : "none";
    }

    document
        .getElementById("resetExtra")
        ?.remove();

    document
        .getElementById("signupExtra")
        ?.remove();

    if (emailField) {
        emailField.classList.remove("hide");
    }

    if (passwordField) {
        passwordField.classList.remove("hide");
    }

    if (originalRoleField) {
        originalRoleField.classList.remove("hide");
    }

    if (authMode === "signup") {
        let extra =
            document.getElementById("signupExtra");

        if (!extra) {
            extra = document.createElement("div");
            extra.id = "signupExtra";

            if (passwordField) {
                passwordField.before(extra);
            }
        }

        extra.innerHTML = `
            <div class="auth-field">
                <label>FULL NAME</label>
                <input
                    id="authName"
                    placeholder="Your full name"
                >
            </div>

            <div class="auth-field">
                <label>ACCOUNT TYPE</label>

                <div class="role-grid">
                    <button
                        type="button"
                        class="role-btn active"
                        onclick="pickRole(this,'student')"
                    >
                        Student
                    </button>

                    <button
                        type="button"
                        class="role-btn"
                        onclick="pickRole(this,'alumni')"
                    >
                        Alumni
                    </button>
                </div>
            </div>

            <div class="auth-field">
                <label>ENROLLMENT NUMBER</label>

                <input
                    id="authEnrollment"
                    placeholder="Enrollment number"
                >
            </div>

            <div class="auth-field">
                <label>DEPARTMENT</label>

                <input
                    id="authDepartment"
                    placeholder="Computer Engineering"
                >
            </div>

            <div class="auth-field">
                <label>SEMESTER / BATCH</label>

                <input
                    id="authSemester"
                    placeholder="6th Semester / 2026"
                >
            </div>
        `;

        if (originalRoleField) {
            originalRoleField.classList.add("hide");
        }

        if (note) {
            note.textContent =
                "Student and Alumni accounts can be created here.";
        }

        if (submitButton) {
            submitButton.textContent =
                "Create Account";

            submitButton.onclick =
                registerAccount;
        }

        pickedRole = "student";

        return;
    }

    if (authMode === "forgot") {
        if (originalRoleField) {
            originalRoleField.classList.add("hide");
        }

        if (passwordField) {
            passwordField.classList.add("hide");
        }

        if (emailInput) {
            emailInput.value = "";
        }

        if (note) {
            note.textContent =
                "If the account exists, a reset link valid for 30 minutes will be sent.";
        }

        if (submitButton) {
            submitButton.textContent =
                "Send Reset Link";

            submitButton.onclick =
                requestForgotPassword;
        }

        return;
    }

    if (authMode === "reset") {
        if (originalRoleField) {
            originalRoleField.classList.add("hide");
        }

        if (emailField) {
            emailField.classList.add("hide");
        }

        if (passwordField) {
            passwordField.classList.add("hide");
        }

        let extra =
            document.getElementById("resetExtra");

        if (!extra) {
            extra = document.createElement("div");
            extra.id = "resetExtra";

            if (emailField) {
                emailField.before(extra);
            }
        }

        extra.innerHTML = `
            <div class="auth-field">
                <label>NEW PASSWORD</label>

                <input
                    type="password"
                    id="resetPassword"
                    placeholder="At least 8 characters"
                >
            </div>

            <div class="auth-field">
                <label>CONFIRM NEW PASSWORD</label>

                <input
                    type="password"
                    id="resetConfirm"
                    placeholder="Repeat new password"
                >
            </div>
        `;

        if (note) {
            note.textContent =
                "Reset links expire after 30 minutes and can only be used once.";
        }

        if (submitButton) {
            submitButton.textContent =
                "Set New Password";

            submitButton.onclick =
                () => resetPasswordFromLink(
                    window.currentResetToken
                );
        }

        return;
    }

    if (originalRoleField) {
        originalRoleField.classList.remove("hide");
    }

    if (emailField) {
        emailField.classList.remove("hide");
    }

    if (passwordField) {
        passwordField.classList.remove("hide");
    }

    const title =
        document.getElementById("authTitle");

    const sub =
        document.getElementById("authSub");

    if (title) {
        title.textContent = "Sign in";
    }

    if (sub) {
        sub.textContent =
            "Access your achievement dashboard.";
    }

    if (note) {
        note.textContent =
            "Use your registered LDRP-ITR account credentials.";
    }

    if (submitButton) {
        submitButton.textContent =
            "Continue to Dashboard";

        submitButton.onclick =
            doLogin;
    }

    const roleButtons =
        document.querySelectorAll(
            "#authScreen .role-grid .role-btn"
        );

    roleButtons.forEach(button => {
        button.classList.remove("active");
    });

    if (roleButtons[0]) {
        roleButtons[0].classList.add("active");
    }

    pickedRole = "student";
}

function closeAuth() {
    document
        .getElementById("authScreen")
        ?.classList.add("hide");
}

function pickRole(button, role) {
    document
        .querySelectorAll(
            "#authScreen .role-grid .role-btn"
        )
        .forEach(b => {
            b.classList.remove("active");
        });

    button.classList.add("active");

    pickedRole = role;
}

async function doLogin() {
    const email =
        document.getElementById("authEmail")
            ?.value
            .trim();

    const password =
        document.getElementById("authPassword")
            ?.value || "";

    if (!email || !password) {
        toast("Enter your email and password.");
        return;
    }

    try {
        const result =
            await apiPost(
                "auth/login.php",
                {
                    email,
                    password
                }
            );

        currentUser = result.data;

        closeAuth();

        document.getElementById("publicSite")
            .style.display = "none";

        document.getElementById("appShell")
            .classList.remove("hide");

        buildDashboard();

    } catch (error) {
        toast(error.message);
    }
}

async function registerAccount() {
    const name =
        document.getElementById("authName")
            ?.value
            .trim();

    const email =
        document.getElementById("authEmail")
            ?.value
            .trim();

    const password =
        document.getElementById("authPassword")
            ?.value || "";

    const enrollment =
        document.getElementById("authEnrollment")
            ?.value
            .trim();

    const department =
        document.getElementById("authDepartment")
            ?.value
            .trim();

    const semester =
        document.getElementById("authSemester")
            ?.value
            .trim();

    if (!name || !email || !password) {
        toast(
            "Name, email and password are required."
        );
        return;
    }

    if (password.length < 8) {
        toast(
            "Password must contain at least 8 characters."
        );
        return;
    }

    try {
        await apiPost(
            "auth/register.php",
            {
                name,
                email,
                password,
                role:
                    pickedRole === "alumni"
                        ? "alumni"
                        : "student",
                enrollment_no: enrollment,
                department,
                semester
            }
        );

        toast(
            "Account created. Please sign in."
        );

        setTimeout(() => {
            openAuth("login");

            const input =
                document.getElementById("authEmail");

            if (input) {
                input.value = email;
            }
        }, 800);

    } catch (error) {
        toast(error.message);
    }
}

function showForgotPassword() {
    authMode = "forgot";

    document
        .getElementById("authScreen")
        ?.classList.remove("hide");

    updateAuthFields();
}

async function requestForgotPassword() {
    const email =
        document.getElementById("authEmail")
            ?.value
            .trim();

    if (!email) {
        toast("Enter your registered email.");
        return;
    }

    try {
        const result =
            await apiPost(
                "auth/forgot-password.php",
                { email }
            );

        toast(result.message);

        setTimeout(() => {
            openAuth("login");

            const input =
                document.getElementById("authEmail");

            if (input) {
                input.value = email;
            }
        }, 1800);

    } catch (error) {
        toast(error.message);
    }
}

function showResetPassword(token) {
    window.currentResetToken = token;
    authMode = "reset";

    document
        .getElementById("authScreen")
        ?.classList.remove("hide");

    updateAuthFields();
}

async function resetPasswordFromLink(token) {
    const password =
        document.getElementById("resetPassword")
            ?.value || "";

    const confirm =
        document.getElementById("resetConfirm")
            ?.value || "";

    if (!password || !confirm) {
        toast(
            "Enter and confirm your new password."
        );
        return;
    }

    if (password.length < 8) {
        toast(
            "Password must contain at least 8 characters."
        );
        return;
    }

    if (password !== confirm) {
        toast(
            "New passwords do not match."
        );
        return;
    }

    try {
        const result =
            await apiPost(
                "auth/reset-password.php",
                {
                    token,
                    password,
                    confirm_password: confirm
                }
            );

        toast(result.message);

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );

        setTimeout(() => {
            window.currentResetToken = null;
            openAuth("login");
        }, 1000);

    } catch (error) {
        toast(error.message);
    }
}

async function logout() {
    try {
        await apiPost(
            "auth/logout.php",
            {}
        );
    } catch (error) {
        console.error(error);
    }

    currentUser = null;

    document
        .getElementById("appShell")
        ?.classList.add("hide");

    const publicSite =
        document.getElementById("publicSite");

    if (publicSite) {
        publicSite.style.display = "block";
    }

    await loadPublic();
}

async function checkSession() {
    try {
        const result =
            await apiGet("auth/me.php");

        if (
            result.success &&
            result.data &&
            result.data.id
        ) {
            currentUser = result.data;

            document.getElementById("publicSite")
                .style.display = "none";

            document.getElementById("appShell")
                .classList.remove("hide");

            buildDashboard();
        }
    } catch (error) {
        console.log("No active session.");
    }
}

function toast(message) {
    const t =
        document.getElementById("toast");

    if (!t) return;

    t.textContent = message;

    t.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer =
        setTimeout(() => {
            t.classList.remove("show");
        }, 2800);
}

function buildDashboard() {
    const roleLabel =
        document.getElementById("roleLabel");

    if (roleLabel) {
        roleLabel.textContent =
            currentUser.role === "student"
                ? "STUDENT DASHBOARD"
                : currentUser.role === "alumni"
                    ? "ALUMNI DASHBOARD"
                    : currentUser.role === "mentor"
                        ? "MENTOR DASHBOARD"
                        : "ADMINISTRATION";
    }

    const menus = {
        student: [
            ["overview", "Overview", "📊"],
            ["submit", "Submit Achievement", "➕"],
            ["mine", "My Achievements", "🏆"],
            ["profile", "Profile", "👤"]
        ],

        alumni: [
            ["overview", "Overview", "📊"],
            ["submit", "Submit Achievement", "➕"],
            ["mine", "My Achievements", "🏆"],
            ["profile", "Profile", "👤"]
        ],

        mentor: [
            ["overview", "Overview", "📊"],
            ["review", "Review Queue", "📥"],
            ["approved", "Approved by Me", "✅"],
            ["users", "Manage Users", "👥"],
            ["profile", "Profile & Security", "👤"]
        ],

        admin: [
            ["overview", "Overview", "📊"],
            ["users", "Manage Users", "👥"],
            ["all", "All Achievements", "🏆"],
            ["categories", "Categories", "🗂"],
            ["featured", "Featured Selection", "⭐"],
            ["profile", "Profile & Security", "👤"]
        ]
    };

    const menu =
        menus[currentUser.role] ||
        menus.student;

    const sidebar =
        document.getElementById("sidebar");

    if (!sidebar) return;

    sidebar.innerHTML =
        menu.map((item, index) => `
            <button
                data-tab="${item[0]}"
                class="sidebar-btn ${index === 0 ? "active" : ""}"
                onclick="switchTab('${item[0]}',this)"
            >
                <span>${item[2]}</span>
                ${item[1]}
            </button>
        `).join("");

    switchTab(menu[0][0]);
}

function switchTab(tab, button) {
    document
        .querySelectorAll(".sidebar-btn")
        .forEach(b => {
            b.classList.remove("active");
        });

    if (button) {
        button.classList.add("active");
    } else {
        document
            .querySelector(
                `.sidebar-btn[data-tab="${tab}"]`
            )
            ?.classList.add("active");
    }

    const main =
        document.getElementById("appMain");

    if (!main) return;

    if (tab === "profile") {
        return accountView(main);
    }

    if (
        tab === "users" &&
        (
            currentUser.role === "mentor"
            ||
            currentUser.role === "admin"
        )
    ) {
        return manageUsersView(main);
    }

    if (
        currentUser.role === "student" ||
        currentUser.role === "alumni"
    ) {
        return studentView(tab, main);
    }

    if (currentUser.role === "mentor") {
        return mentorView(tab, main);
    }

    return adminView(tab, main);
}

async function loadStudentStats() {
    const result =
        await apiGet(
            "dashboard/stats.php"
        );

    return result.data || {};
}

async function loadMyAchievements() {
    const result =
        await apiGet(
            "achievements/my-achievements.php"
        );

    return Array.isArray(result.data)
        ? result.data
        : [];
}

async function studentView(tab, main) {
    if (tab === "overview") {
        main.innerHTML = `
            <h1>
                Welcome back, ${escapeHTML(currentUser.name)}
            </h1>

            <p class="sub">
                Here's a snapshot of your achievement record.
            </p>

            <div class="kpis" id="studentKpis">
                <div class="kpi">
                    <div class="n">...</div>
                    <div class="l">Total submitted</div>
                </div>

                <div class="kpi">
                    <div class="n">...</div>
                    <div class="l">Approved</div>
                </div>

                <div class="kpi">
                    <div class="n">...</div>
                    <div class="l">Pending review</div>
                </div>

                <div class="kpi">
                    <div class="n">...</div>
                    <div class="l">Achievement points</div>
                </div>
            </div>

            <div class="panel" id="studentRecent">
                Loading...
            </div>
        `;

        try {
            const [
                stats,
                mine
            ] = await Promise.all([
                loadStudentStats(),
                loadMyAchievements()
            ]);

            document.getElementById("studentKpis")
                .innerHTML = `
                    <div class="kpi">
                        <div class="n">
                            ${Number(stats.total || 0)}
                        </div>
                        <div class="l">
                            Total submitted
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(stats.approved || 0)}
                        </div>
                        <div class="l">
                            Approved
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(stats.pending || 0)}
                        </div>
                        <div class="l">
                            Pending review
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(stats.points || 0)}
                        </div>
                        <div class="l">
                            Achievement points
                        </div>
                    </div>
                `;

            document.getElementById("studentRecent")
                .innerHTML = `
                    <h3>Recent activity</h3>

                    ${
                        mine.length
                            ? mine
                                .slice(0, 5)
                                .map(rowLine)
                                .join("")
                            : `
                                <p style="color:var(--muted);font-size:13.5px;">
                                    No submissions yet — add your first achievement.
                                </p>
                            `
                    }
                `;

        } catch (error) {
            toast(error.message);
        }

        return;
    }

    if (tab === "submit") {
        main.innerHTML = `
            <h1>Submit an Achievement</h1>

            <p class="sub">
                Fill in the details below; a mentor will review and verify it.
            </p>

            <div class="panel">

                <div class="formgrid">

                    <div>
                        <label class="flabel">
                            Title
                        </label>

                        <input
                            class="finput"
                            id="f_title"
                            placeholder="e.g. Winner, National Robotics Challenge"
                        >
                    </div>

                    <div>
                        <label class="flabel">
                            Category
                        </label>

                        <select
                            class="finput"
                            id="f_cat"
                        >
                            ${
                                CATEGORIES.map(c => `
                                    <option value="${c.id}">
                                        ${escapeHTML(c.n)}
                                    </option>
                                `).join("")
                            }
                        </select>
                    </div>

                </div>

                <div style="margin-top:16px;">

                    <label class="flabel">
                        Description
                    </label>

                    <textarea
                        class="finput"
                        id="f_desc"
                        rows="4"
                        placeholder="Briefly describe the achievement, context, and impact."
                    ></textarea>

                </div>

                <div style="margin-top:16px;">

                    <label class="flabel">
                        Certificate / Image
                    </label>

                    <div
                        class="dropzone"
                        onclick="document.getElementById('f_file').click()"
                    >
                        📎 Click to attach certificate or photo
                        (PDF, JPG, PNG)
                    </div>

                    <input
                        type="file"
                        id="f_file"
                        class="hide"
                        accept=".pdf,.jpg,.jpeg,.png"
                    >

                    <div
                        id="fileName"
                        style="margin-top:8px;color:var(--muted);font-size:11px;"
                    ></div>

                </div>

                <button
                    class="btn btn-gold"
                    style="margin-top:20px;padding:12px 26px;"
                    onclick="submitAchievement()"
                >
                    Submit for review
                </button>

            </div>
        `;

        document
            .getElementById("f_file")
            ?.addEventListener(
                "change",
                function() {
                    const file =
                        this.files[0];

                    const fileName =
                        document.getElementById(
                            "fileName"
                        );

                    if (fileName) {
                        fileName.textContent =
                            file
                                ? file.name
                                : "";
                    }
                }
            );

        return;
    }

    if (tab === "mine") {
        main.innerHTML = `
            <h1>My Achievements</h1>

            <p class="sub">
                Track the status of everything you've submitted.
            </p>

            <div class="panel">
                <div class="tablewrap">
                    Loading...
                </div>
            </div>
        `;

        try {
            const mine =
                await loadMyAchievements();

            document
                .querySelector(
                    "#appMain .tablewrap"
                )
                .innerHTML = `
                    <table>

                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Date</th>
                            <th>Certificate</th>
                            <th>Status</th>
                        </tr>

                        ${
                            mine.length
                                ? mine.map(a => `
                                    <tr>

                                        <td>
                                            ${escapeHTML(a.title)}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                a.category || "-"
                                            )}
                                        </td>

                                        <td>
                                            ${getDate(a)}
                                        </td>

                                        <td>
                                            ${certificateLink(
                                                a.certificate_path
                                            )}
                                        </td>

                                        <td>
                                            ${pill(a.status)}
                                        </td>

                                    </tr>
                                `).join("")
                                : `
                                    <tr>
                                        <td
                                            colspan="5"
                                            style="color:var(--muted)"
                                        >
                                            Nothing submitted yet.
                                        </td>
                                    </tr>
                                `
                        }

                    </table>
                `;

        } catch (error) {
            toast(error.message);
        }

        return;
    }

    if (tab === "profile") {
        return accountView(main);
    }
}

function certificateLink(path) {
    if (!path) {
        return `
            <span style="color:var(--muted)">
                Not uploaded
            </span>
        `;
    }

    const url =
        `backend/${String(path).replace(/^\/+/, "")}`;

    const lower =
        String(path).toLowerCase();

    const isImage =
        /\.(jpg|jpeg|png)$/i.test(lower);

    return `
        <a
            href="${escapeHTML(url)}"
            target="_blank"
            rel="noopener noreferrer"
            style="
                color:var(--gold);
                font-weight:700;
                text-decoration:none;
            "
        >
            ${isImage ? "View Photo" : "View Certificate"}
        </a>
    `;
}

function rowLine(a) {
    return `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            padding:11px 0;
            border-bottom:1px solid #f2efe6;
            font-size:13.5px;
        ">

            <span>
                ${escapeHTML(a.title || "")}
            </span>

            ${certificateLink(a.certificate_path)}

            ${pill(a.status)}

        </div>
    `;
}

function pill(status) {
    const safeStatus =
        String(status || "pending").toLowerCase();

    const label =
        safeStatus.charAt(0).toUpperCase() +
        safeStatus.slice(1);

    return `
        <span class="status-pill st-${escapeHTML(safeStatus)}">
            ${escapeHTML(label)}
        </span>
    `;
}

async function submitAchievement() {
    const title =
        document.getElementById("f_title")
            ?.value
            .trim();

    const category =
        document.getElementById("f_cat")
            ?.value;

    const description =
        document.getElementById("f_desc")
            ?.value
            .trim();

    const file =
        document.getElementById("f_file")
            ?.files[0];

    if (!title) {
        toast(
            "Add a title before submitting."
        );
        return;
    }

    if (!description) {
        toast(
            "Please describe your achievement."
        );
        return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
        toast(
            "Certificate must be 5 MB or smaller."
        );
        return;
    }

    const formData =
        new FormData();

    formData.append(
        "title",
        title
    );

    formData.append(
        "description",
        description
    );

    formData.append(
        "category_id",
        category
    );

    if (file) {
        formData.append(
            "certificate",
            file
        );
    }

    try {
        await api(
            "achievements/create.php",
            {
                method: "POST",
                body: formData
            }
        );

        toast(
            "Achievement submitted for mentor review."
        );

        switchTab("mine");

    } catch (error) {
        toast(error.message);
    }
}

function accountView(main) {
    main.innerHTML = `
        <h1>Profile & Security</h1>

        <p class="sub">
            Update your account details and change your password securely.
        </p>

        <div class="panel formgrid">

            <div>
                <label class="flabel">
                    Full name
                </label>

                <input
                    class="finput"
                    id="profileName"
                    value="${escapeHTML(
                        currentUser.name || ""
                    )}"
                >
            </div>

            <div>
                <label class="flabel">
                    Enrollment no.
                </label>

                <input
                    class="finput"
                    id="profileEnrollment"
                    value="${escapeHTML(
                        currentUser.enrollment_no || ""
                    )}"
                >
            </div>

            <div>
                <label class="flabel">
                    Department
                </label>

                <input
                    class="finput"
                    id="profileDepartment"
                    value="${escapeHTML(
                        currentUser.department || ""
                    )}"
                >
            </div>

            <div>
                <label class="flabel">
                    Semester / Batch
                </label>

                <input
                    class="finput"
                    id="profileSemester"
                    value="${escapeHTML(
                        currentUser.semester || ""
                    )}"
                >
            </div>

            <div>
                <label class="flabel">
                    Email
                </label>

                <input
                    class="finput"
                    value="${escapeHTML(
                        currentUser.email || ""
                    )}"
                    disabled
                >
            </div>

            <div>
                <label class="flabel">
                    Role
                </label>

                <input
                    class="finput"
                    value="${escapeHTML(
                        getRoleLabel(
                            currentUser.role
                        )
                    )}"
                    disabled
                >
            </div>

        </div>

        <div style="margin-top:16px;">
            <button
                class="btn btn-gold"
                onclick="updateProfile()"
            >
                Save Profile
            </button>
        </div>

        <div
            class="panel"
            style="margin-top:22px;"
        >
            <h3>Change Password</h3>

            <p class="sub">
                Use your current password to set a new one.
            </p>

            <div class="formgrid">

                <div>
                    <label class="flabel">
                        Current password
                    </label>

                    <input
                        class="finput"
                        type="password"
                        id="currentPassword"
                    >
                </div>

                <div>
                    <label class="flabel">
                        New password
                    </label>

                    <input
                        class="finput"
                        type="password"
                        id="newPassword"
                        placeholder="At least 8 characters"
                    >
                </div>

                <div>
                    <label class="flabel">
                        Confirm new password
                    </label>

                    <input
                        class="finput"
                        type="password"
                        id="confirmPassword"
                    >
                </div>

            </div>

            <div style="margin-top:16px;">

                <button
                    class="btn btn-gold"
                    id="savePasswordBtn"
                    onclick="changeMyPassword()"
                >
                    Save New Password
                </button>

            </div>
        </div>
    `;
}

async function changeMyPassword() {
    const currentInput =
        document.getElementById(
            "currentPassword"
        );

    const newInput =
        document.getElementById(
            "newPassword"
        );

    const confirmInput =
        document.getElementById(
            "confirmPassword"
        );

    const button =
        document.getElementById(
            "savePasswordBtn"
        );

    const current =
        currentInput?.value || "";

    const newPassword =
        newInput?.value || "";

    const confirm =
        confirmInput?.value || "";

    if (!current || !newPassword || !confirm) {
        toast(
            "Please fill all three password fields."
        );
        return;
    }

    if (newPassword.length < 8) {
        toast(
            "New password must contain at least 8 characters."
        );
        return;
    }

    if (newPassword !== confirm) {
        toast(
            "New passwords do not match."
        );
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
    }

    try {
        const result =
            await apiPost(
                "users/change-password.php",
                {
                    current_password: current,
                    new_password: newPassword,
                    confirm_password: confirm
                }
            );

        toast(
            result.message ||
            "Password changed successfully."
        );

        if (currentInput) {
            currentInput.value = "";
        }

        if (newInput) {
            newInput.value = "";
        }

        if (confirmInput) {
            confirmInput.value = "";
        }

    } catch (error) {
        toast(
            error.message ||
            "Password change failed."
        );

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                "Save New Password";
        }
    }
}

async function updateProfile() {
    const name =
        document.getElementById(
            "profileName"
        )?.value.trim();

    const enrollment =
        document.getElementById(
            "profileEnrollment"
        )?.value.trim();

    const department =
        document.getElementById(
            "profileDepartment"
        )?.value.trim();

    const semester =
        document.getElementById(
            "profileSemester"
        )?.value.trim();

    if (!name) {
        toast("Name is required.");
        return;
    }

    try {
        const result =
            await apiPost(
                "users/profile.php",
                {
                    name,
                    enrollment_no:
                        enrollment,
                    department,
                    semester
                }
            );

        currentUser = {
            ...currentUser,
            name,
            enrollment_no:
                enrollment,
            department,
            semester
        };

        toast(
            result.message ||
            "Profile updated successfully."
        );

        buildDashboard();

    } catch (error) {
        toast(error.message);
    }
}

async function mentorView(tab, main) {
    if (tab === "overview") {
        main.innerHTML = `
            <h1>
                Welcome, ${escapeHTML(
                    currentUser.name
                )}
            </h1>

            <p class="sub">
                Review queue at a glance.
            </p>

            <div
                class="kpis"
                id="mentorKpis"
            >
                Loading...
            </div>
        `;

        try {
            const result =
                await apiGet(
                    "dashboard/stats.php"
                );

            const stats =
                result.data || {};

            document
                .getElementById("mentorKpis")
                .innerHTML = `
                    <div class="kpi">
                        <div class="n">
                            ${Number(
                                stats.pending || 0
                            )}
                        </div>
                        <div class="l">
                            Awaiting review
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(
                                stats.approved || 0
                            )}
                        </div>
                        <div class="l">
                            Approved
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(
                                stats.rejected || 0
                            )}
                        </div>
                        <div class="l">
                            Rejected
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(
                                stats.assigned_students || 0
                            )}
                        </div>
                        <div class="l">
                            Assigned students
                        </div>
                    </div>
                `;

        } catch (error) {
            toast(error.message);
        }

        return;
    }

    if (tab === "review") {
        main.innerHTML = `
            <h1>Review Queue</h1>

            <p class="sub">
                Verify submissions and recommend for approval.
            </p>

            <div class="panel">
                <div class="tablewrap">
                    Loading...
                </div>
            </div>
        `;

        try {
            const result =
                await apiGet(
                    "achievements/review-queue.php"
                );

            const pending =
                Array.isArray(result.data)
                    ? result.data
                    : [];

            document
                .querySelector(
                    "#appMain .tablewrap"
                )
                .innerHTML = `
                    <table>

                        <tr>
                            <th>Student</th>
                            <th>Achievement</th>
                            <th>Category</th>
                            <th>Submitted</th>
                            <th>Certificate / Photo</th>
                            <th>Action</th>
                        </tr>

                        ${
                            pending.length
                                ? pending.map(a => `
                                    <tr>

                                        <td>
                                            ${escapeHTML(
                                                a.name
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                a.title
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                a.category
                                            )}
                                        </td>

                                        <td>
                                            ${getDate(a)}
                                        </td>

                                        <td>
                                            ${certificateLink(
                                                a.certificate_path
                                            )}
                                        </td>

                                        <td>
                                            <div class="row-actions">

                                                <button
                                                    class="mini-btn mini-approve"
                                                    onclick="setStatus(${Number(a.id)},'approved')"
                                                >
                                                    Approve
                                                </button>

                                                <button
                                                    class="mini-btn mini-reject"
                                                    onclick="setStatus(${Number(a.id)},'rejected')"
                                                >
                                                    Reject
                                                </button>

                                            </div>
                                        </td>

                                    </tr>
                                `).join("")
                                : `
                                    <tr>
                                        <td
                                            colspan="6"
                                            style="color:var(--muted)"
                                        >
                                            Queue is clear.
                                        </td>
                                    </tr>
                                `
                        }

                    </table>
                `;

        } catch (error) {
            toast(error.message);
        }

        return;
    }

    if (tab === "approved") {
        main.innerHTML = `
            <h1>Approved by Me</h1>

            <p class="sub">
                A record of achievements you've verified.
            </p>

            <div class="panel">
                Loading...
            </div>
        `;

        try {
            const result =
                await apiGet(
                    "achievements/review-queue.php?scope=reviewed"
                );

            const records =
                Array.isArray(result.data)
                    ? result.data
                    : [];

            document
                .querySelector(
                    "#appMain .panel"
                )
                .innerHTML =
                records.length
                    ? records.map(rowLine).join("")
                    : `
                        <p style="color:var(--muted)">
                            No records available.
                        </p>
                    `;

        } catch (error) {
            toast(error.message);
        }
    }
}

async function setStatus(id, status) {
    let points = 0;
    let rejectionReason = "";

    if (status === "approved") {
        const entered =
            prompt(
                "Enter achievement points (0 - 1000):",
                "50"
            );

        if (entered === null) {
            return;
        }

        points = Number(entered);

        if (
            !Number.isInteger(points) ||
            points < 0 ||
            points > 1000
        ) {
            toast(
                "Points must be between 0 and 1000."
            );
            return;
        }

    } else {
        rejectionReason =
            prompt(
                "Enter the reason for rejection:"
            );

        if (
            rejectionReason === null ||
            !rejectionReason.trim()
        ) {
            toast(
                "Rejection reason is required."
            );
            return;
        }
    }

    try {
        await apiPost(
            "achievements/update-status.php",
            {
                achievement_id: id,
                status,
                points,
                rejection_reason:
                    rejectionReason
            }
        );

        toast(
            status === "approved"
                ? "Achievement approved."
                : "Achievement rejected."
        );

        if (currentUser.role === "mentor") {
            switchTab("review");
        } else {
            switchTab("all");
        }

        await loadPublicAchievements();

        renderPublic();

    } catch (error) {
        toast(error.message);
    }
}

async function manageUsersView(main) {
    main.innerHTML = `
        <h1>Manage Users</h1>

        <p class="sub">
            Manage student and alumni accounts.
        </p>

        <div class="panel">
            <div class="tablewrap">
                Loading...
            </div>
        </div>
    `;

    try {
        const result =
            await apiGet(
                "users/list.php"
            );

        const users =
            result.data?.users ||
            result.data ||
            [];

        document
            .querySelector(
                "#appMain .tablewrap"
            )
            .innerHTML = `
                <table>

                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Achievements</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>

                    ${
                        users.length
                            ? users.map(user => `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                            user.name
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            user.email
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            getRoleLabel(
                                                user.role
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            user.department ||
                                            "-"
                                        )}
                                    </td>

                                    <td>
                                        ${Number(
                                            user.achievement_count ||
                                            0
                                        )}
                                    </td>

                                    <td>
                                        ${pill(
                                            user.status
                                        )}
                                    </td>

                                    <td>
                                        ${
                                            ["student", "alumni"]
                                                .includes(
                                                    user.role
                                                )
                                                ? `
                                                    <div class="row-actions">

                                                        ${
                                                            currentUser.role === "admin"
                                                                ? `
                                                                    <button
                                                                        class="mini-btn mini-reject"
                                                                        onclick="deleteUserAccount(${Number(user.id)}, '${escapeHTML(user.name).replace(/'/g, "\\'")}')"
                                                                    >
                                                                        Delete
                                                                    </button>

                                                                    <button
                                                                        class="mini-btn mini-feature"
                                                                        onclick="adminResetUserPassword(${Number(user.id)}, '${escapeHTML(user.name).replace(/'/g, "\\'")}')"
                                                                    >
                                                                        Reset Password
                                                                    </button>
                                                                `
                                                                : `
                                                                    <span style="color:var(--muted)">
                                                                        Student account
                                                                    </span>
                                                                `
                                                        }

                                                    </div>
                                                `
                                                : `
                                                    <span style="color:var(--muted)">
                                                        Management account
                                                    </span>
                                                `
                                        }
                                    </td>

                                </tr>
                            `).join("")
                            : `
                                <tr>
                                    <td
                                        colspan="7"
                                        style="color:var(--muted)"
                                    >
                                        No users found.
                                    </td>
                                </tr>
                            `
                    }

                </table>
            `;

    } catch (error) {
        toast(error.message);
    }
}

async function deleteUserAccount(id, name) {
    const confirmed =
        window.confirm(
            `Delete ${name} permanently?\n\nThis removes the account, achievements, mentor assignment and uploaded certificate/photo files. This cannot be undone.`
        );

    if (!confirmed) {
        return;
    }

    try {
        await apiPost(
            "users/delete.php",
            {
                user_id: id
            }
        );

        toast(
            "User deleted successfully."
        );

        manageUsersView(
            document.getElementById(
                "appMain"
            )
        );

    } catch (error) {
        toast(error.message);
    }
}

async function adminResetUserPassword(id, name) {
    const password =
        window.prompt(
            `Set a new password for ${name}:`
        );

    if (password === null) {
        return;
    }

    if (password.length < 8) {
        toast(
            "Password must contain at least 8 characters."
        );
        return;
    }

    const confirm =
        window.prompt(
            "Confirm the new password:"
        );

    if (confirm === null) {
        return;
    }

    if (password !== confirm) {
        toast(
            "Passwords do not match."
        );
        return;
    }

    try {
        await apiPost(
            "users/reset-password.php",
            {
                user_id: id,
                password
            }
        );

        toast(
            "Password reset successfully."
        );

    } catch (error) {
        toast(error.message);
    }
}

async function adminView(tab, main) {
    if (tab === "overview") {
        main.innerHTML = `
            <h1>Admin Overview</h1>

            <p class="sub">
                Portal-wide activity and health.
            </p>

            <div
                class="kpis"
                id="adminKpis"
            >
                Loading...
            </div>

            <div class="panel">
                <h3>Recent submissions</h3>
                Loading...
            </div>
        `;

        try {
            const [
                statsResult,
                achievementsResult
            ] = await Promise.all([
                apiGet(
                    "dashboard/stats.php"
                ),
                apiGet(
                    "admin/achievements.php"
                )
            ]);

            const stats =
                statsResult.data || {};

            const all =
                Array.isArray(
                    achievementsResult.data
                )
                    ? achievementsResult.data
                    : [];

            document
                .getElementById("adminKpis")
                .innerHTML = `
                    <div class="kpi">
                        <div class="n">
                            ${Number(
                                stats.total || 0
                            )}
                        </div>
                        <div class="l">
                            Total achievements
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(
                                stats.pending || 0
                            )}
                        </div>
                        <div class="l">
                            Pending review
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(
                                stats.users || 0
                            )}
                        </div>
                        <div class="l">
                            Registered users
                        </div>
                    </div>

                    <div class="kpi">
                        <div class="n">
                            ${Number(
                                stats.categories || 0
                            )}
                        </div>
                        <div class="l">
                            Active categories
                        </div>
                    </div>
                `;

            document
                .querySelector(
                    "#appMain .panel"
                )
                .innerHTML = `
                    <h3>
                        Recent submissions
                    </h3>

                    ${
                        all.length
                            ? all
                                .slice(0, 6)
                                .map(rowLine)
                                .join("")
                            : `
                                <p style="color:var(--muted)">
                                    No submissions yet.
                                </p>
                            `
                    }
                `;

        } catch (error) {
            toast(error.message);
        }

        return;
    }

    if (tab === "users") {
        return manageUsersView(main);
    }

    if (tab === "all") {
        main.innerHTML = `
            <h1>All Achievements</h1>

            <p class="sub">
                Full record across the institution.
            </p>

            <div class="panel">

                <div class="tablewrap">
                    Loading...
                </div>

            </div>
        `;

        try {
            const result =
                await apiGet(
                    "admin/achievements.php"
                );

            const all =
                Array.isArray(result.data)
                    ? result.data
                    : [];

            document
                .querySelector(
                    "#appMain .tablewrap"
                )
                .innerHTML = `
                    <table>

                        <tr>
                            <th>Name</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Certificate / Photo</th>
                            <th>Action</th>
                        </tr>

                        ${
                            all.length
                                ? all.map(a => `
                                    <tr>

                                        <td>
                                            ${escapeHTML(
                                                a.name
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                a.title
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                a.category
                                            )}
                                        </td>

                                        <td>
                                            ${pill(
                                                a.status
                                            )}
                                        </td>

                                        <td>
                                            ${certificateLink(
                                                a.certificate_path
                                            )}
                                        </td>

                                        <td>

                                            <div class="row-actions">

                                                ${
                                                    a.status === "pending"
                                                        ? `
                                                            <button
                                                                class="mini-btn mini-approve"
                                                                onclick="setStatus(${Number(a.id)},'approved')"
                                                            >
                                                                Approve
                                                            </button>

                                                            <button
                                                                class="mini-btn mini-reject"
                                                                onclick="setStatus(${Number(a.id)},'rejected')"
                                                            >
                                                                Reject
                                                            </button>
                                                        `
                                                        : a.status === "approved"
                                                            ? `
                                                                <button
                                                                    class="mini-btn mini-feature"
                                                                    onclick="toggleFeature(${Number(a.id)})"
                                                                >
                                                                    ${
                                                                        Number(
                                                                            a.featured
                                                                        )
                                                                            ? "Unfeature"
                                                                            : "Feature"
                                                                    }
                                                                </button>
                                                            `
                                                            : "-"
                                                }

                                            </div>

                                        </td>

                                    </tr>
                                `).join("")
                                : `
                                    <tr>
                                        <td
                                            colspan="6"
                                            style="color:var(--muted)"
                                        >
                                            No achievements found.
                                        </td>
                                    </tr>
                                `
                        }

                    </table>
                `;

        } catch (error) {
            toast(error.message);
        }

        return;
    }

    if (tab === "categories") {
        main.innerHTML = `
            <h1>Categories</h1>

            <p class="sub">
                Achievement classification across the institution.
            </p>

            <div class="panel">

                <div class="tablewrap">

                    <table>

                        <tr>
                            <th>Category</th>
                            <th>Entries</th>
                        </tr>

                        ${
                            CATEGORIES.map(
                                category => `
                                    <tr>
                                        <td>
                                            <span
                                                style="
                                                    display:inline-block;
                                                    width:28px;
                                                "
                                            >
                                                ${category.ic}
                                            </span>

                                            ${escapeHTML(
                                                category.n
                                            )}
                                        </td>

                                        <td>
                                            ${Number(
                                                category.c || 0
                                            )}
                                        </td>
                                    </tr>
                                `
                            ).join("")
                        }

                    </table>

                </div>

            </div>
        `;

        return;
    }

    if (tab === "featured") {
        main.innerHTML = `
            <h1>Featured Selection</h1>

            <p class="sub">
                Choose which achievements appear on the public homepage.
            </p>

            <div class="panel">
                Loading...
            </div>
        `;

        try {
            const result =
                await apiGet(
                    "admin/achievements.php"
                );

            const approved =
                (
                    Array.isArray(result.data)
                        ? result.data
                        : []
                ).filter(
                    a => a.status === "approved"
                );

            document
                .querySelector(
                    "#appMain .panel"
                )
                .innerHTML =
                approved.length
                    ? approved.map(a => `
                        <div style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:12px 0;
                            border-bottom:1px solid #f2efe6;
                            gap:20px;
                        ">

                            <div>

                                <div style="
                                    font-weight:600;
                                    font-size:13.5px;
                                ">
                                    ${escapeHTML(
                                        a.title
                                    )}
                                </div>

                                <div style="
                                    font-size:12px;
                                    color:var(--muted);
                                ">
                                    ${escapeHTML(
                                        a.name
                                    )}
                                    ·
                                    ${escapeHTML(
                                        a.category
                                    )}
                                </div>

                            </div>

                            <button
                                class="mini-btn mini-feature"
                                onclick="toggleFeature(${Number(a.id)})"
                            >
                                ${
                                    Number(a.featured)
                                        ? "Featured ✓"
                                        : "Feature"
                                }
                            </button>

                        </div>
                    `).join("")
                    : `
                        <p style="color:var(--muted)">
                            No approved achievements available.
                        </p>
                    `;

        } catch (error) {
            toast(error.message);
        }
    }
}

async function changeUserStatus(id, status) {
    try {
        await apiPost(
            "users/update-status.php",
            {
                user_id: id,
                status
            }
        );

        toast(
            status === "active"
                ? "User activated."
                : "User blocked."
        );

        switchTab("users");

    } catch (error) {
        toast(error.message);
    }
}

async function toggleFeature(id) {
    try {
        const result =
            await apiPost(
                "achievements/toggle-featured.php",
                {
                    achievement_id: id
                }
            );

        toast(result.message);

        await loadPublicAchievements();

        renderPublic();

        switchTab("featured");

    } catch (error) {
        toast(error.message);
    }
}

function prepareAuth() {
    const passwordInput =
        document.querySelector(
            '#authScreen input[type="password"]'
        );

    if (
        passwordInput &&
        !passwordInput.id
    ) {
        passwordInput.id =
            "authPassword";
    }

    const emailInput =
        document.getElementById(
            "authEmail"
        );

    if (emailInput) {
        emailInput.value = "";
    }
}

async function startApp() {
    prepareAuth();
    setupPublicListeners();

    const resetTokenFromUrl =
        new URLSearchParams(
            window.location.search
        ).get("reset");

    if (
        resetTokenFromUrl &&
        /^[a-f0-9]{64}$/i.test(
            resetTokenFromUrl
        )
    ) {
        showResetPassword(
            resetTokenFromUrl
        );
    }

    await loadPublic();
    await checkSession();
}

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        startApp
    );
} else {
    startApp();
}
