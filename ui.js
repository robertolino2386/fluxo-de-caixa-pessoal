(function(){
  const root = document.documentElement;
  const saved = localStorage.getItem('fluxo-theme') || 'white';
  root.dataset.theme = saved;

  function syncThemeButtons(){
    document.querySelectorAll('[data-theme-option]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeOption === root.dataset.theme);
    });
  }

  window.setTheme = function(theme){
    root.dataset.theme = theme;
    localStorage.setItem('fluxo-theme', theme);
    syncThemeButtons();
  };

  window.toggleSidebar = function(){
    document.querySelector('.sidebar')?.classList.toggle('open');
  };

  window.fecharModal = function(id){ document.getElementById(id)?.classList.remove('open'); };
  window.abrirModal = function(id){ document.getElementById(id)?.classList.add('open'); };
  window.mostrarToast = function(msg){
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(()=>toast.classList.remove('show'),2200);
  };

  if(typeof window.abrirFormLancamento !== 'function') window.abrirFormLancamento = () => abrirModal('modalLancamento');
  if(typeof window.salvarLancamento !== 'function') window.salvarLancamento = (e) => { e?.preventDefault(); mostrarToast('Layout pronto. Conecte esta ação ao seu app.js atual.'); };
  if(typeof window.onChangeFormaPagamento !== 'function') window.onChangeFormaPagamento = function(){
    const credito = document.getElementById('lFormaPagamento')?.value === 'Crédito';
    const cartao = document.getElementById('grupoCartao'); const parcelas = document.getElementById('grupoParcelas');
    if(cartao) cartao.style.display = credito ? 'grid' : 'none'; if(parcelas) parcelas.style.display = credito ? 'grid' : 'none';
  };
  if(typeof window.toggleQtdParcelas !== 'function') window.toggleQtdParcelas = function(){
    const el = document.getElementById('lQtdParcelas'); if(el) el.disabled = document.getElementById('lParcelado')?.value !== 'Sim';
  };
  if(typeof window.renderLancamentos !== 'function') window.renderLancamentos = () => mostrarToast('Filtros aplicados no layout. Integre com sua fonte de dados.');
  if(typeof window.renderParcelas !== 'function') window.renderParcelas = () => mostrarToast('Filtro de parcelas aplicado.');
  if(typeof window.renderDashboard !== 'function') window.renderDashboard = () => mostrarToast('Filtro do dashboard aplicado.');
  if(typeof window.carregarTudo !== 'function') window.carregarTudo = () => mostrarToast('Atualização solicitada.');
  if(typeof window.gerarPDF !== 'function') window.gerarPDF = () => mostrarToast('Conecte gerarPDF() ao seu app.js atual.');
  if(typeof window.abrirFormCadastro !== 'function') window.abrirFormCadastro = (sheet) => {
    const hidden = document.getElementById('cSheet'); if(hidden) hidden.value = sheet;
    const title = document.getElementById('modalCadastroTitle'); if(title) title.textContent = 'Novo registro';
    abrirModal('modalCadastro');
  };
  if(typeof window.salvarCadastro !== 'function') window.salvarCadastro = (e) => { e?.preventDefault(); mostrarToast('Conecte salvarCadastro() ao seu app.js atual.'); };

  document.addEventListener('DOMContentLoaded', () => {
    syncThemeButtons();
    const date = document.getElementById('dataHoje');
    if(date) date.textContent = new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date());

    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
      const group = btn.closest('.content') || document;
      group.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      group.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active'); document.getElementById('tab-'+btn.dataset.tab)?.classList.add('active');
    }));

    document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('click', e => {
      if(e.target === overlay) overlay.classList.remove('open');
    }));
  });
})();
