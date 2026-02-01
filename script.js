const PROJECT_URL = "https://pzpqeeozqwrmjfjwvitk.supabase.co"; 
const PROJECT_KEY = "sb_publishable_fvfSb6moZ1Fmy60hYFXytA_dE5bItx1"; 
const clientSupabase = supabase.createClient(PROJECT_URL, PROJECT_KEY);

let SEMUA_DATA = [];
let TARGET_NAMA = localStorage.getItem('goal_nama') || "Belum ada target";
let TARGET_NOMINAL = parseInt(localStorage.getItem('goal_nom')) || 0;

function simpanTargetBaru() {
    const nama = document.getElementById('set_nama_target').value;
    const nominal = document.getElementById('set_nom_target').value;
    if (!nama || !nominal) return Swal.fire('Oops!', 'Lengkapi target.', 'warning');
    localStorage.setItem('goal_nama', nama);
    localStorage.setItem('goal_nom', nominal);
    TARGET_NAMA = nama; TARGET_NOMINAL = parseInt(nominal);
    Swal.fire('Target Dipasang!', `Nabung buat ${nama}`, 'success');
    muatData();
}

function toggleAuth(showRegister) {
    document.getElementById('login-ui').classList.toggle('hidden', showRegister);
    document.getElementById('register-ui').classList.toggle('hidden', !showRegister);
}

async function handleLogin() {
    const email = document.getElementById('login_email').value;
    const password = document.getElementById('login_pass').value;
    const { error } = await clientSupabase.auth.signInWithPassword({ email, password });
    if (error) Swal.fire('Gagal', 'Email/Pass salah.', 'error');
    else checkUserStatus();
}

async function handleSignUp() {
    const email = document.getElementById('reg_email').value;
    const password = document.getElementById('reg_pass').value;
    const { error } = await clientSupabase.auth.signUp({ email, password });
    if (error) Swal.fire('Gagal', error.message, 'error');
    else { Swal.fire('Berhasil', 'Silakan login.', 'success'); toggleAuth(false); }
}

async function simpanData() {
    const { data: { user } } = await clientSupabase.auth.getUser();
    const nama = document.getElementById('nama_penabung').value;
    const ket = document.getElementById('ket_transaksi').value;
    const nom = parseInt(document.getElementById('nom_transaksi').value);
    if(!nama || !nom) return Swal.fire('Data Kurang', 'Isi nama & nominal.', 'info');
    const { error } = await clientSupabase.from('tabungan').insert([{ nama_penabung: nama, keterangan: ket, nominal: nom, user_id: user.id }]);
    if (!error) { muatData(); document.getElementById('nom_transaksi').value = ''; }
}

async function muatData() {
    const { data } = await clientSupabase.from('tabungan').select('*').order('created_at', { ascending: false });
    SEMUA_DATA = data || [];
    renderData(SEMUA_DATA);
}

function renderData(dataList) {
    const container = document.getElementById('list-tabungan');
    let totalSaldo = 0, totalHariIni = 0;
    const hariIni = new Date().toDateString();
    container.innerHTML = '';
    dataList.forEach(item => {
        const itemDate = new Date(item.created_at);
        totalSaldo += Number(item.nominal);
        if (itemDate.toDateString() === hariIni) totalHariIni += Number(item.nominal);
        const tgl = itemDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        container.innerHTML += `
        <div class="history-item fade-in">
            <div class="flex items-center gap-4">
                <button onclick="hapusData(${item.id})" class="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                <div>
                    <p class="font-black text-slate-800 text-sm">${item.nama_penabung}</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">${tgl} • ${item.keterangan || 'Nabung'}</p>
                </div>
            </div>
            <p class="font-black text-blue-600 text-sm">Rp ${Number(item.nominal).toLocaleString()}</p>
        </div>`;
    });
    document.getElementById('total-saldo').innerText = "Rp " + totalSaldo.toLocaleString();
    document.getElementById('stat-hari-ini').innerText = "Rp " + totalHariIni.toLocaleString();
    document.getElementById('stat-jumlah').innerText = dataList.length;
    updateGoalUI(totalSaldo);
}

function filterData() {
    const kw = document.getElementById('search-input').value.toLowerCase();
    const filter = SEMUA_DATA.filter(i => i.nama_penabung.toLowerCase().includes(kw) || (i.keterangan && i.keterangan.toLowerCase().includes(kw)));
    renderData(filter);
}

function updateGoalUI(total) {
    if (TARGET_NOMINAL === 0) {
        document.getElementById('nama-target').innerText = "BELUM ADA TARGET";
        document.getElementById('sisa-target').innerText = "SET TARGETMU DI FORM ATAS!";
        return;
    }
    const persen = Math.min((total / TARGET_NOMINAL) * 100, 100);
    const sisa = Math.max(TARGET_NOMINAL - total, 0);
    document.getElementById('nama-target').innerText = TARGET_NAMA;
    document.getElementById('persen-goal').innerText = Math.floor(persen) + "%";
    document.getElementById('progress-bar').style.width = persen + "%";
    document.getElementById('sisa-target').innerText = sisa <= 0 ? "TARGET TERCAPAI! ✨" : `SISA RP ${sisa.toLocaleString()} LAGI!`;
    if(persen >= 100) document.getElementById('progress-bar').classList.add('bg-emerald-500');
}

async function hapusData(id) {
    const res = await Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) { await clientSupabase.from('tabungan').delete().eq('id', id); muatData(); }
}

async function handleLogout() { await clientSupabase.auth.signOut(); checkUserStatus(); }

async function checkUserStatus() {
    const { data: { user } } = await clientSupabase.auth.getUser();
    document.getElementById('auth-section').classList.toggle('hidden', user);
    document.getElementById('app-section').classList.toggle('hidden', !user);
    if (user) muatData();
}

async function hapusAkun() {
    const res = await Swal.fire({ title: 'Hapus Akun?', text: "Semua data akan hangus!", icon: 'error', showCancelButton: true });
    if (res.isConfirmed) {
        const { data: { user } } = await clientSupabase.auth.getUser();
        await clientSupabase.from('tabungan').delete().eq('user_id', user.id);
        await handleLogout();
    }
}

checkUserStatus();