// --- MOCK DATABASE ---
const mockCertificates = [
    {
        id: "cert1",
        title: "B.Tech Computer Science",
        issuer: "Indian Institute of Technology",
        year: 2024,
        category: "Education",
        status: "verified",
        trustExplanation: "Verifiable digital signature found. Layout exactly matches official IIT templates.",
        expiry: null
    },
    {
        id: "cert2",
        title: "AWS Solutions Architect",
        issuer: "Amazon Web Services",
        year: 2023,
        category: "Skill Development",
        status: "verified",
        trustExplanation: "QR code verified against AWS validation server.",
        expiry: "2026-08-14"
    },
    {
        id: "cert3",
        title: "Full Stack Internship",
        issuer: "TechCorp Global",
        year: 2025,
        category: "Career / Internship",
        status: "semi",
        trustExplanation: "Issuer domain recognized, but no cryptographic signature present on this document.",
        expiry: null
    },
    {
        id: "cert4",
        title: "Driving Licence (LMV)",
        issuer: "Transport Department",
        year: 2018,
        category: "Government / Identity",
        status: "verified",
        trustExplanation: "Format and ID matched structured logic for Govt DL formats.",
        expiry: "2038-05-10"
    },
    {
        id: "cert5",
        title: "Vehicle Pollution Certificate",
        issuer: "Emission Control Board",
        year: 2025,
        category: "Vehicle Documents",
        status: "unverified",
        trustExplanation: "User uploaded photo. Text extracted but formatting does not match a known strict template.",
        expiry: "2026-04-15" // Expires soon
    }
];

// --- DOM ELEMENTS ---
const grid = document.getElementById("cert-grid");
const uploadBtn = document.getElementById("uploadBtn");
const uploadModal = document.getElementById("uploadModal");
const closeModalBtn = document.getElementById("closeModal");
const detailModal = document.getElementById("detailModal");
const closeDetailBtn = document.getElementById("closeDetail");
const uploadArea = document.getElementById("uploadArea");
const processingState = document.getElementById("processingState");

// --- INITIALIZE UI ---
function renderCertificates(filter = 'all') {
    grid.innerHTML = '';
    
    let filteredCerts = mockCertificates;
    if (filter !== 'all') {
        filteredCerts = mockCertificates.filter(c => c.status === filter);
    }
    
    filteredCerts.forEach(cert => {
        const card = document.createElement("div");
        card.className = `cert-card glass-panel ${cert.status}`;
        card.onclick = () => openCertificate(cert);
        
        let iconClass = "fa-file-contract";
        if (cert.category.includes("Education")) iconClass = "fa-graduation-cap";
        if (cert.category.includes("Skill")) iconClass = "fa-award";
        if (cert.category.includes("Identity")) iconClass = "fa-id-card";
        if (cert.category.includes("Vehicle")) iconClass = "fa-car";

        let trustLabel = "Verified";
        if (cert.status === "semi") trustLabel = "Semi-Verified";
        if (cert.status === "unverified") trustLabel = "Unverified";

        let expiryHTML = '';
        if (cert.expiry) {
            const expDate = new Date(cert.expiry);
            const today = new Date();
            const diffTime = Math.abs(expDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (expDate < today) {
                expiryHTML = `<div class="expiry danger-text"><i class="fa-solid fa-triangle-exclamation"></i> Expired</div>`;
            } else if (diffDays < 30) {
                expiryHTML = `<div class="expiry danger-text"><i class="fa-solid fa-clock"></i> Expires in ${diffDays} days</div>`;
            } else {
                expiryHTML = `<div class="expiry">Valid till ${cert.expiry}</div>`;
            }
        } else {
             expiryHTML = `<div class="expiry">Lifetime Valiy</div>`;
        }

        card.innerHTML = `
            <div class="cert-header">
                <i class="fa-solid ${iconClass} cert-icon"></i>
                <div class="trust-status ${cert.status}">${trustLabel}</div>
            </div>
            <h3 class="cert-title" title="${cert.title}">${cert.title}</h3>
            <p class="cert-issuer">${cert.issuer}</p>
            <div class="cert-meta">
                <span>${cert.year}</span>
                ${expiryHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

function openCertificate(cert) {
    document.getElementById("detail-title").innerText = cert.title;
    document.getElementById("detail-title-visual").innerText = cert.title;
    document.getElementById("detail-issuer").innerText = cert.issuer;
    document.getElementById("detail-issuer-visual").innerText = cert.issuer;
    document.getElementById("detail-year").innerText = cert.year;
    document.getElementById("detail-category").innerText = cert.category;
    
    let trustLabel = "Verified";
    let trustIcon = "fa-circle-check";
    let trustColor = "var(--success)";
    if (cert.status === "semi") { trustLabel = "Semi-Verified"; trustIcon = "fa-shield-halved"; trustColor = "var(--warning)"; }
    if (cert.status === "unverified") { trustLabel = "Unverified"; trustIcon = "fa-circle-exclamation"; trustColor = "var(--danger)"; }
    
    const trustBadge = document.getElementById("detail-trust");
    trustBadge.innerHTML = `<i class="fa-solid ${trustIcon}"></i> ${trustLabel}`;
    trustBadge.style.color = trustColor;
    trustBadge.style.background = `rgba(${cert.status === 'verified' ? '16, 185, 129' : cert.status === 'semi' ? '245, 158, 11' : '239, 68, 68'}, 0.1)`;

    document.getElementById("detail-explanation").innerText = "AI VERIFICATION SYSTEM: " + cert.trustExplanation;

    const expiryEl = document.getElementById("detail-expiry");
    if(cert.expiry) {
        expiryEl.innerText = cert.expiry;
        expiryEl.className = "warning-text";
    } else {
        expiryEl.innerText = "Lifetime (No Expiry)";
        expiryEl.className = "safe";
    }

    detailModal.classList.add("active");
}

window.filterCertificates = (filter) => {
    // Reset active style on stats visually (omitted for brevity, just renders)
    renderCertificates(filter);
}

// --- MODAL & UPLOAD LOGIC ---
uploadBtn.addEventListener("click", () => {
    uploadArea.style.display = "block";
    processingState.style.display = "none";
    uploadModal.classList.add("active");
});

closeModalBtn.addEventListener("click", () => {
    uploadModal.classList.remove("active");
});

closeDetailBtn.addEventListener("click", () => {
    detailModal.classList.remove("active");
});

uploadArea.addEventListener("click", simulateAIProcess);

function simulateAIProcess() {
    uploadArea.style.display = "none";
    processingState.style.display = "block";

    const steps = document.querySelectorAll(".ai-steps li");
    let currentStep = 0;

    const interval = setInterval(() => {
        steps[currentStep].innerHTML = `<i class="fa-solid fa-check" style="color: #4CAF50"></i> ${steps[currentStep].innerText}`;
        steps[currentStep].style.opacity = "1";
        
        currentStep++;
        
        if(currentStep < steps.length) {
            const originalText = steps[currentStep].innerText;
            steps[currentStep].innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${originalText}`;
            steps[currentStep].style.opacity = "1";
        } else {
            clearInterval(interval);
            setTimeout(() => {
                uploadModal.classList.remove("active");
                // Add new mock cert
                mockCertificates.unshift({
                    id: "cert" + Date.now(),
                    title: "Advanced React Patterns",
                    issuer: "Frontend Masters",
                    year: new Date().getFullYear(),
                    category: "Skill Development",
                    status: "verified",
                    trustExplanation: "Digital certificate ID instantly matched and verified against the issuer's public database.",
                    expiry: null
                });
                renderCertificates('all');
                document.getElementById("total-count").innerText = mockCertificates.length;
            }, 1000);
        }
    }, 1200);
}

// Init
renderCertificates();
document.getElementById("total-count").innerText = mockCertificates.length;
