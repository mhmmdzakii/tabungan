const PROJECT_URL = "https://pzpqeeozqwrmjfjwvitk.supabase.co"; 
const PROJECT_KEY = "sb_publishable_fvfSb6moZ1Fmy60hYFXytA_dE5bItx1"; 
const clientSupabase = supabase.createClient(PROJECT_URL, PROJECT_KEY);

let SEMUA_DATA = [];
let chartInstansi = null;
let TARGET_NAMA = localStorage.getItem('goal_nama') || "Belum ada target";
let TARGET_NOMINAL = parseInt(localStorage.getItem('goal_nom')) || 0;

// --- TAB SYSTEM ---
function switchTab(tabName) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Deactivate all nav links
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    // Show selected
    document.getElementById('tab-' + tabName).classList.add('active');
    document.getElementById('nav-' + tabName).classList.add('active');
}

// --- AUTH FUNCTIONS ---
async function handleLogin() {
    const email = document.getElementById('login_email').value;
    const password = document.getElementById('login_pass').value;
    const { error } = await clientSupabase.auth.signInWithPassword({ email, password });
    if (error) Swal.fire('Gagal', error.message, 'error');
    else checkUserStatus();
}

async function handleSignUp() {
    const email = document.getElementById('reg_email').value;
    const password = document.getElementById('reg_pass').value;
    const { error } = await clientSupabase.auth.signUp({ email, password });
    if (error) Swal.fire('Gagal', error.message, 'error');
    else Swal.fire('Berhasil', 'Cek email verifikasi!', 'success');
}

async function handleLogout() {
    await clientSupabase.auth.signOut();
    checkUserStatus();
}

async function checkUserStatus() {
    const { data: { user } } = await clientSupabase.auth.getUser();
    document.getElementById('auth-section').classList.toggle('hidden', !!user);
    document.getElementById('app-section').classList.toggle('hidden', !user);
    document.getElementById('navbar').classList.toggle('hidden', !user);
    if (user) muatData();
}

function toggleAuth(isReg) {
    document.getElementById('login-form').classList.toggle('hidden', isReg);
    document.getElementById('reg-form').classList.toggle('hidden', !isReg);
}

// --- DATA FUNCTIONS ---
async function muatData() {
    const { data: { user } } = await clientSupabase.auth.getUser();
    const { data, error } = await clientSupabase.from('tabungan').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error) {
        SEMUA_DATA = data;
        renderData(data);
    }
}

async function simpanData() {
    const { data: { user } } = await clientSupabase.auth.getUser();
    const nama = document.getElementById('nama_penabung').value;
    const nom = parseInt(document.getElementById('nom_transaksi').value);
    if(!nama || !nom) return Swal.fire('Isi data!', '', 'info');

    const { error } = await clientSupabase.from('tabungan').insert([{ nama_penabung: nama, nominal: nom, user_id: user.id }]);
    if (!error) {
        Swal.fire('Berhasil', 'Tersimpan!', 'success');
        document.getElementById('nom_transaksi').value = '';
        muatData();
    }
}

function renderData(dataList) {
    const container = document.getElementById('list-tabungan');
    let total = 0;
    container.innerHTML = '';

    dataList.forEach(item => {
        total += Number(item.nominal);
        const tgl = new Date(item.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'short'});
        container.innerHTML += `
            <div class="flex justify-between items-center p-4 glass mb-2">
                <div class="flex items-center gap-3">
                    <button onclick="hapusData(${item.id})" class="text-red-300 hover:text-red-500">🗑️</button>
                    <div>
                        <p class="font-black text-sm">${item.nama_penabung}</p>
                        <p class="text-[9px] text-slate-400 uppercase font-bold">${tgl}</p>
                    </div>
                </div>
                <p class="font-black text-blue-600 text-sm">Rp ${Number(item.nominal).toLocaleString()}</p>
            </div>`;
    });

    document.getElementById('total-saldo').innerText = "Rp " + total.toLocaleString();
    updateBadge(total);
    updateGoalUI(total);
    renderChart(dataList);
}

function renderChart(dataList) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const reversed = [...dataList].reverse();
    const labels = reversed.map(d => new Date(d.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'short'}));
    let cum = 0;
    const values = reversed.map(d => { cum += Number(d.nominal); return cum; });

    if (chartInstansi) chartInstansi.destroy();
    chartInstansi = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ data: values, borderColor: '#3b82f6', fill: true, backgroundColor: 'rgba(59, 130, 246, 0.05)', tension: 0.4 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function updateBadge(total) {
    const icon = document.getElementById('badge-icon');
    const name = document.getElementById('badge-name');
    if (total >= 10000000) { icon.innerText="💎"; name.innerText="Diamond Member"; }
    else if (total >= 1000000) { icon.innerText="🥇"; name.innerText="Gold Member"; }
    else { icon.innerText="🥉"; name.innerText="Bronze Member"; }
}

function updateGoalUI(total) {
    const percent = Math.min((total / TARGET_NOMINAL) * 100, 100);
    const sisa = Math.max(TARGET_NOMINAL - total, 0);
    document.getElementById('nama-target').innerText = TARGET_NAMA.toUpperCase();
    document.getElementById('persen-goal').innerText = Math.floor(percent) + "%";
    document.getElementById('progress-bar').style.width = percent + "%";
    document.getElementById('sisa-target').innerText = sisa <= 0 ? "TARGET TERCAPAI! ✨" : `Kurang Rp ${sisa.toLocaleString()} lagi!`;
}

function simpanTargetBaru() {
    const n = document.getElementById('set_nama_target').value;
    const v = document.getElementById('set_nom_target').value;
    if(!n || !v) return;
    localStorage.setItem('goal_nama', n);
    localStorage.setItem('goal_nom', v);
    TARGET_NAMA = n; TARGET_NOMINAL = parseInt(v);
    muatData();
    Swal.fire('Target Terpasang!', '', 'success');
}

async function hapusData(id) {
    const res = await Swal.fire({ title: 'Hapus?', showCancelButton: true });
    if (res.isConfirmed) {
        await clientSupabase.from('tabungan').delete().eq('id', id);
        muatData();
    }
}

function quickNom(v) { document.getElementById('nom_transaksi').value = v; }

function exportKeCSV() {
    let csv = "Tanggal,Nama,Nominal\n";
    SEMUA_DATA.forEach(r => csv += `${new Date(r.created_at).toLocaleDateString()},${r.nama_penabung},${r.nominal}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Laporan.csv'; a.click();
}

checkUserStatus();
