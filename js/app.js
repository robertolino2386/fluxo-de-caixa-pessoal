// ===================== ESTADO GLOBAL =====================
let DB = { Lancamentos: [], Parcelas: [], ClientesFornecedores: [], Categorias: [], ContasBancarias: [], CartoesCredito: [] };
let charts = {};

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ===================== INICIALIZAÇÃO =====================
function iniciarApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appRoot').classList.add('active');
  document.getElementById('dataHoje').textContent = new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'long', year:'numeric'});
  montarNavegacao();
  carregarTudo();
}

function montarNavegacao(){
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('click', ()=>{
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      item.classList.add('active');
      const sec = item.dataset.section;
      document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
      document.getElementById('sec-'+sec).classList.add('active');
      document.getElementById('pageTitle').textContent = item.textContent.trim();
    });
  });
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    });
  });
}

async function carregarTudo(){
  showToast('Carregando dados...');
  try{
    await fetch(API_URL + '?action=checkVencidos');
    const results = await Promise.all(SHEET_KEYS.map(s => fetch(API_URL + '?action=list&sheet=' + s).then(r=>r.json())));
    SHEET_KEYS.forEach((s,i)=> DB[s] = Array.isArray(results[i]) ? results[i] : []);
    popularSelects();
    renderDashboard();
    renderLancamentos();
    renderParcelas();
    renderCadastros();
    showToast('Dados atualizados!');
  }catch(err){
    showToast('Erro ao carregar dados: ' + err.message, true);
  }
}

// ===================== API HELPERS =====================
async function apiPost(action, sheet, data){
  const res = await fetch(API_URL, { method:'POST', body: JSON.stringify({action, sheet, data}) });
  return res.json();
}

function showToast(msg, isError){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(()=> t.className='toast', 2500);
}

function fecharModal(id){ document.getElementById(id).classList.remove('active'); }
function abrirModal(id){ document.getElementById(id).classList.add('active'); }

function fmtMoeda(v){ return (Number(v)||0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); }

// ===================== SELECTS AUXILIARES =====================
function popularSelects(){
  const anos = new Set([new Date().getFullYear()]);
  DB.Lancamentos.forEach(l=> l.DataCompra && anos.add(new Date(l.DataCompra).getFullYear()));
  const anosArr = Array.from(anos).sort();

  const mesOptions = '<option value="">Todos</option>' + MESES.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  const anoOptions = '<option value="">Todos</option>' + anosArr.map(a=>`<option value="${a}">${a}</option>`).join('');
  ['fMes','dashMes','rMes'].forEach(id=> document.getElementById(id).innerHTML = mesOptions);
  ['fAno','dashAno','rAno'].forEach(id=> document.getElementById(id).innerHTML = anoOptions);
  const hoje = new Date();
  document.getElementById('dashMes').value = hoje.getMonth()+1;
  document.getElementById('dashAno').value = hoje.getFullYear();

  const contaOpts = '<option value="">Todas</option>' + DB.ContasBancarias.filter(c=>c.Ativo==='Sim').map(c=>`<option value="${c.NomeBanco}">${c.NomeBanco}</option>`).join('');
  document.getElementById('fConta').innerHTML = contaOpts;

  const catOpts = '<option value="">Todas</option>' + DB.Categorias.filter(c=>c.Ativo==='Sim').map(c=>`<option value="${c.Nome}">${c.Nome}</option>`).join('');
  document.getElementById('fCategoria').innerHTML = catOpts;

  // selects do form de lançamento
  document.getElementById('lCliente').innerHTML = DB.ClientesFornecedores.filter(c=>c.Ativo==='Sim').map(c=>`<option value="${c.Nome}">${c.Nome}</option>`).join('');
  document.getElementById('lConta').innerHTML = DB.ContasBancarias.filter(c=>c.Ativo==='Sim').map(c=>`<option value="${c.NomeBanco}">${c.NomeBanco}</option>`).join('');
  document.getElementById('lCartao').innerHTML = DB.CartoesCredito.filter(c=>c.Ativo==='Sim').map(c=>`<option value="${c.NomeCartao}">${c.NomeCartao}</option>`).join('');
  atualizarCategoriaSelect();
}

function atualizarCategoriaSelect(){
  const tipo = document.getElementById('lTipo').value || 'Despesa';
  document.getElementById('lCategoria').innerHTML = DB.Categorias.filter(c=>c.Ativo==='Sim' && c.Tipo===tipo).map(c=>`<option value="${c.Nome}">${c.Nome}</option>`).join('');
}
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('lTipo')?.addEventListener('change', atualizarCategoriaSelect);
});

// ===================== DASHBOARD =====================
function renderDashboard(){
  const mes = document.getElementById('dashMes').value;
  const ano = document.getElementById('dashAno').value;

  const lancDoMes = DB.Lancamentos.filter(l=> filtraMesAno(l.DataCompra, mes, ano));
  const receitas = lancDoMes.filter(l=>l.Tipo==='Receita').reduce((s,l)=>s+Number(l.ValorTotal||0),0);
  const despesas = lancDoMes.filter(l=>l.Tipo==='Despesa').reduce((s,l)=>s+Number(l.ValorTotal||0),0);

  const saldoTotal = DB.ContasBancarias.reduce((s,c)=>{
    let saldo = Number(c.SaldoInicial||0);
    DB.Lancamentos.forEach(l=>{
      if(l.ContaBancaria===c.NomeBanco && l.Status==='Liquidado'){
        saldo += l.Tipo==='Receita' ? Number(l.ValorTotal||0) : -Number(l.ValorTotal||0);
      }
    });
    return s+saldo;
  },0);

  document.getElementById('cardSaldo').textContent = fmtMoeda(saldoTotal);
  document.getElementById('cardReceita').textContent = fmtMoeda(receitas);
  document.getElementById('cardDespesa').textContent = fmtMoeda(despesas);

  const hojeStr = new Date().toISOString().slice(0,10);
  const alertas = [
    ...DB.Lancamentos.filter(l=> l.Status!=='Liquidado' && (l.DataVencimento===hojeStr || l.Status==='Vencido')),
    ...DB.Parcelas.filter(p=> p.Status!=='Liquidado' && (p.DataVencimento===hojeStr || p.Status==='Vencido'))
  ];
  document.getElementById('cardAlerta').textContent = alertas.length;

  const listaEl = document.getElementById('listaLembretes');
  listaEl.innerHTML = alertas.length ? alertas.map(a=>{
    const nome = a.ClienteFornecedor || (DB.Lancamentos.find(l=>l.ID===a.ID_Lancamento)||{}).ClienteFornecedor || '';
    return `<div class="lembrete-item"><span>${nome} — vencimento ${a.DataVencimento}</span><span class="badge ${a.Status}">${a.Status}</span></div>`;
  }).join('') : '<p class="empty-msg">Nenhuma conta vencendo hoje ou atrasada.</p>';

  // Gráfico rosca + barras: despesas por categoria no período
  const porCategoria = {};
  lancDoMes.filter(l=>l.Tipo==='Despesa').forEach(l=>{
    porCategoria[l.Categoria] = (porCategoria[l.Categoria]||0) + Number(l.ValorTotal||0);
  });
  const catLabels = Object.keys(porCategoria);
  const catValores = Object.values(porCategoria);
  const cores = catLabels.map((_,i)=> ['#1E3A8A','#60A5FA','#2563EB','#93C5FD','#1D4ED8','#3B82F6','#0EA5E9','#38BDF8'][i%8]);

  renderChart('chartRosca','doughnut', catLabels, [{data:catValores, backgroundColor:cores}]);
  renderChart('chartBarras','bar', catLabels, [{label:'Despesas', data:catValores, backgroundColor:'#1E3A8A'}]);

  // Colunas: receita x despesa dos últimos 6 meses
  const labelsMeses = [], recData = [], despData = [];
  const base = ano && mes ? new Date(ano, mes-1, 1) : new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(base.getFullYear(), base.getMonth()-i, 1);
    labelsMeses.push(MESES[d.getMonth()].slice(0,3)+'/'+String(d.getFullYear()).slice(2));
    const doMes = DB.Lancamentos.filter(l=> filtraMesAno(l.DataCompra, d.getMonth()+1, d.getFullYear()));
    recData.push(doMes.filter(l=>l.Tipo==='Receita').reduce((s,l)=>s+Number(l.ValorTotal||0),0));
    despData.push(doMes.filter(l=>l.Tipo==='Despesa').reduce((s,l)=>s+Number(l.ValorTotal||0),0));
  }
  renderChart('chartColunas','bar', labelsMeses, [
    {label:'Receitas', data:recData, backgroundColor:'#60A5FA'},
    {label:'Despesas', data:despData, backgroundColor:'#1E3A8A'}
  ]);
}

function filtraMesAno(dataStr, mes, ano){
  if(!dataStr) return false;
  const d = new Date(dataStr);
  if(mes && (d.getMonth()+1) != mes) return false;
  if(ano && d.getFullYear() != ano) return false;
  return true;
}

function renderChart(id, type, labels, datasets){
  const ctx = document.getElementById(id);
  if(charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, { type, data:{labels, datasets}, options:{responsive:true, plugins:{legend:{position:'bottom'}}} });
}

// ===================== LANÇAMENTOS =====================
function renderLancamentos(){
  const mes = document.getElementById('fMes').value;
  const ano = document.getElementById('fAno').value;
  const conta = document.getElementById('fConta').value;
  const tipo = document.getElementById('fTipo').value;
  const categoria = document.getElementById('fCategoria').value;

  let lista = DB.Lancamentos.filter(l=>{
    if(mes && !filtraMesAno(l.DataCompra, mes, null)) return false;
    if(ano && !filtraMesAno(l.DataCompra, null, ano)) return false;
    if(conta && l.ContaBancaria!==conta) return false;
    if(tipo && l.Tipo!==tipo) return false;
    if(categoria && l.Categoria!==categoria) return false;
    return true;
  }).sort((a,b)=> new Date(b.DataCompra) - new Date(a.DataCompra));

  const tbody = document.getElementById('tblLancamentos');
  tbody.innerHTML = lista.length ? lista.map(l=>{
    const forn = DB.ClientesFornecedores.find(c=>c.Nome===l.ClienteFornecedor);
    const wppBtn = forn && forn.Telefone ? `<button class="icon-btn wpp" title="WhatsApp" onclick="enviarWhatsApp('${forn.Telefone}','${l.ClienteFornecedor}','${l.DataVencimento}','${l.ValorTotal}')"><i class="fa-brands fa-whatsapp"></i></button>` : '';
    return `<tr>
      <td>${formatarData(l.DataCompra)}</td>
      <td>${l.ClienteFornecedor||''}</td>
      <td>${l.Categoria||''}</td>
      <td>${l.Tipo||''}</td>
      <td>${l.FormaPagamento||''}${l.Parcelado==='Sim'?' ('+l.QtdParcelas+'x)':''}</td>
      <td>${l.ContaBancaria||''}</td>
      <td>${fmtMoeda(l.ValorTotal)}</td>
      <td>${formatarData(l.DataVencimento)}</td>
      <td><span class="badge ${l.Status}">${l.Status}</span></td>
      <td class="actions-cell">
        ${l.Status!=='Liquidado' ? `<button class="icon-btn" title="Liquidar" onclick="liquidarLancamento('${l.ID}')"><i class="fa-solid fa-check"></i></button>` : ''}
        <button class="icon-btn" title="Editar" onclick="editarLancamento('${l.ID}')"><i class="fa-solid fa-pen"></i></button>
        ${wppBtn}
        <button class="icon-btn del" title="Excluir" onclick="excluirLancamento('${l.ID}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="10" class="empty-msg">Nenhum lançamento encontrado.</td></tr>';
}

function formatarData(d){ if(!d) return ''; const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('pt-BR'); }

function abrirFormLancamento(){
  document.getElementById('formLancamento').reset();
  document.getElementById('lID').value = '';
  document.getElementById('modalLancTitle').textContent = 'Novo lançamento';
  atualizarCategoriaSelect();
  onChangeFormaPagamento();
  abrirModal('modalLancamento');
}

function editarLancamento(id){
  const l = DB.Lancamentos.find(x=>x.ID===id);
  if(!l) return;
  document.getElementById('lID').value = l.ID;
  document.getElementById('lCliente').value = l.ClienteFornecedor;
  document.getElementById('lTipo').value = l.Tipo;
  atualizarCategoriaSelect();
  document.getElementById('lCategoria').value = l.Categoria;
  document.getElementById('lValor').value = l.ValorTotal;
  document.getElementById('lDataCompra').value = l.DataCompra;
  document.getElementById('lFormaPagamento').value = l.FormaPagamento;
  document.getElementById('lConta').value = l.ContaBancaria;
  document.getElementById('lCartao').value = l.CartaoCredito || '';
  document.getElementById('lDataVencimento').value = l.DataVencimento;
  document.getElementById('lObs').value = l.Observacoes || '';
  onChangeFormaPagamento();
  document.getElementById('modalLancTitle').textContent = 'Editar lançamento (datas e observações)';
  abrirModal('modalLancamento');
}

function onChangeFormaPagamento(){
  const forma = document.getElementById('lFormaPagamento').value;
  document.getElementById('grupoCartao').style.display = forma==='Crédito' ? 'block' : 'none';
  document.getElementById('grupoParcelas').style.display = forma==='Crédito' ? 'grid' : 'none';
  if(forma!=='Crédito'){
    document.getElementById('lParcelado').value='Não';
  }
}
function toggleQtdParcelas(){
  document.getElementById('lQtdParcelas').disabled = document.getElementById('lParcelado').value !== 'Sim';
}

async function salvarLancamento(ev){
  ev.preventDefault();
  const id = document.getElementById('lID').value;
  const forma = document.getElementById('lFormaPagamento').value;
  const dataCompra = document.getElementById('lDataCompra').value;
  const cartaoNome = document.getElementById('lCartao').value;
  const parcelado = document.getElementById('lParcelado').value;
  const qtdParcelas = parseInt(document.getElementById('lQtdParcelas').value)||1;

  let dataVencimento = document.getElementById('lDataVencimento').value;
  let status = 'Pendente';
  let dataPagamento = '';

  if(forma === 'Débito' || forma === 'Dinheiro' || forma === 'PIX' || forma === 'Transferência'){
    dataVencimento = dataCompra; // regra: débito vence no mesmo dia da compra
    dataPagamento = dataCompra;
    status = 'Liquidado';
  } else if(forma === 'Crédito'){
    const cartao = DB.CartoesCredito.find(c=>c.NomeCartao===cartaoNome);
    if(cartao){
      dataVencimento = calcularVencimentoFatura(dataCompra, Number(cartao.DiaFechamento), Number(cartao.DiaVencimento));
    }
  }

  const data = {
    ClienteFornecedor: document.getElementById('lCliente').value,
    Tipo: document.getElementById('lTipo').value,
    Categoria: document.getElementById('lCategoria').value,
    FormaPagamento: forma,
    ContaBancaria: document.getElementById('lConta').value,
    CartaoCredito: forma==='Crédito' ? cartaoNome : '',
    ValorTotal: parseFloat(document.getElementById('lValor').value),
    Parcelado: forma==='Crédito' ? parcelado : 'Não',
    QtdParcelas: forma==='Crédito' && parcelado==='Sim' ? qtdParcelas : '',
    DataLancamento: dataCompra,
    DataCompra: dataCompra,
    DataVencimento: dataVencimento,
    DataPagamento: dataPagamento,
    Status: status,
    Observacoes: document.getElementById('lObs').value
  };

  let lancId = id;
  if(id){
    data.ID = id;
    await apiPost('update','Lancamentos', data);
  } else {
    const resp = await apiPost('create','Lancamentos', data);
    lancId = resp.ID;
    // gera parcelas se aplicável
    if(forma==='Crédito' && parcelado==='Sim' && qtdParcelas>1){
      const cartao = DB.CartoesCredito.find(c=>c.NomeCartao===cartaoNome);
      const valorParcela = Math.round((data.ValorTotal/qtdParcelas)*100)/100;
      let vencAtual = dataVencimento;
      for(let i=1;i<=qtdParcelas;i++){
        if(i>1) vencAtual = somarMeses(vencAtual, 1);
        await apiPost('create','Parcelas', {
          ID_Lancamento: lancId,
          NumeroParcela: i+'/'+qtdParcelas,
          ValorParcela: valorParcela,
          DataVencimento: vencAtual,
          DataPagamento: '',
          Status: 'Pendente'
        });
      }
    }
  }
  fecharModal('modalLancamento');
  showToast('Lançamento salvo!');
  carregarTudo();
}

function calcularVencimentoFatura(dataCompraStr, diaFechamento, diaVencimento){
  const d = new Date(dataCompraStr);
  const diaCompra = d.getDate();
  let mesRef = d.getMonth();
  let anoRef = d.getFullYear();
  if(diaCompra > diaFechamento){ mesRef += 1; }
  mesRef += 1; // mês de vencimento é o mês seguinte ao fechamento
  const venc = new Date(anoRef, mesRef, diaVencimento);
  return venc.toISOString().slice(0,10);
}

function somarMeses(dataStr, n){
  const d = new Date(dataStr);
  const dia = d.getDate();
  d.setMonth(d.getMonth()+n);
  if(d.getDate() < dia) d.setDate(0); // ajuste fim de mês
  return d.toISOString().slice(0,10);
}

async function liquidarLancamento(id){
  const hoje = new Date().toISOString().slice(0,10);
  await apiPost('update','Lancamentos', {ID:id, Status:'Liquidado', DataPagamento:hoje});
  showToast('Lançamento liquidado!');
  carregarTudo();
}

async function excluirLancamento(id){
  const temParcela = DB.Parcelas.some(p=>p.ID_Lancamento===id);
  if(temParcela){ showToast('Não é possível excluir: existem parcelas vinculadas.', true); return; }
  if(!confirm('Excluir este lançamento?')) return;
  await apiPost('delete','Lancamentos', {ID:id});
  showToast('Lançamento excluído.');
  carregarTudo();
}

function enviarWhatsApp(telefone, nome, vencimento, valor){
  const msg = encodeURIComponent(`Olá ${nome}, este é um lembrete: há um valor de ${fmtMoeda(valor)} com vencimento em ${formatarData(vencimento)}.`);
  window.open(`https://wa.me/${telefone}?text=${msg}`, '_blank');
}

// ===================== PARCELAS =====================
function renderParcelas(){
  const status = document.getElementById('pStatus').value;
  let lista = DB.Parcelas.filter(p=> !status || p.Status===status)
    .sort((a,b)=> new Date(a.DataVencimento) - new Date(b.DataVencimento));

  const tbody = document.getElementById('tblParcelas');
  tbody.innerHTML = lista.length ? lista.map(p=>{
    const lanc = DB.Lancamentos.find(l=>l.ID===p.ID_Lancamento) || {};
    return `<tr>
      <td>${p.ID_Lancamento}</td>
      <td>${lanc.ClienteFornecedor||''}</td>
      <td>${p.NumeroParcela}</td>
      <td>${fmtMoeda(p.ValorParcela)}</td>
      <td>${formatarData(p.DataVencimento)}</td>
      <td>${formatarData(p.DataPagamento)}</td>
      <td><span class="badge ${p.Status}">${p.Status}</span></td>
      <td class="actions-cell">
        ${p.Status!=='Liquidado' ? `<button class="icon-btn" title="Marcar como paga" onclick="liquidarParcela('${p.ID}')"><i class="fa-solid fa-check"></i></button>` : ''}
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="empty-msg">Nenhuma parcela encontrada.</td></tr>';
}

async function liquidarParcela(id){
  const hoje = new Date().toISOString().slice(0,10);
  await apiPost('update','Parcelas', {ID:id, Status:'Liquidado', DataPagamento:hoje});
  showToast('Parcela liquidada!');
  carregarTudo();
}

// ===================== CADASTROS =====================
const FORM_CONFIGS = {
  ClientesFornecedores: [
    {name:'Nome', label:'Nome', type:'text', required:true},
    {name:'Tipo', label:'Tipo', type:'select', options:['Cliente','Fornecedor','Ambos'], required:true},
    {name:'CategoriaPadrao', label:'Categoria padrão', type:'text'},
    {name:'Telefone', label:'Telefone (WhatsApp, ex: 5511999990000)', type:'text'},
    {name:'Email', label:'E-mail', type:'text'},
    {name:'Ativo', label:'Ativo', type:'select', options:['Sim','Não'], required:true, default:'Sim'}
  ],
  Categorias: [
    {name:'Nome', label:'Nome', type:'text', required:true},
    {name:'Tipo', label:'Tipo', type:'select', options:['Despesa','Receita'], required:true},
    {name:'Cor', label:'Cor', type:'color', default:'#1E3A8A'},
    {name:'Ativo', label:'Ativo', type:'select', options:['Sim','Não'], required:true, default:'Sim'}
  ],
  ContasBancarias: [
    {name:'NomeBanco', label:'Nome do banco / conta', type:'text', required:true},
    {name:'TipoConta', label:'Tipo de conta', type:'select', options:['Corrente','Poupança','Investimento'], required:true},
    {name:'SaldoInicial', label:'Saldo inicial (R$)', type:'number', required:true},
    {name:'DataSaldoInicial', label:'Data do saldo inicial', type:'date', required:true},
    {name:'Ativo', label:'Ativo', type:'select', options:['Sim','Não'], required:true, default:'Sim'}
  ],
  CartoesCredito: [
    {name:'NomeCartao', label:'Nome do cartão', type:'text', required:true},
    {name:'Bandeira', label:'Bandeira', type:'text'},
    {name:'ContaBancariaVinculada', label:'Conta bancária vinculada', type:'select', optionsFrom:'ContasBancarias', field:'NomeBanco', required:true},
    {name:'DiaFechamento', label:'Dia de fechamento', type:'number', required:true},
    {name:'DiaVencimento', label:'Dia de vencimento', type:'number', required:true},
    {name:'Limite', label:'Limite (R$)', type:'number'},
    {name:'Ativo', label:'Ativo', type:'select', options:['Sim','Não'], required:true, default:'Sim'}
  ]
};

function renderCadastros(){
  document.getElementById('tbl-ClientesFornecedores').innerHTML = DB.ClientesFornecedores.map(c=>`<tr>
    <td>${c.Nome}</td><td>${c.Tipo}</td><td>${c.CategoriaPadrao||''}</td><td>${c.Telefone||''}</td>
    <td><span class="badge ${c.Ativo==='Sim'?'Liquidado':'Vencido'}">${c.Ativo}</span></td>
    <td class="actions-cell">${acoesCadastro('ClientesFornecedores', c.ID)}</td></tr>`).join('') || linhaVazia(6);

  document.getElementById('tbl-Categorias').innerHTML = DB.Categorias.map(c=>`<tr>
    <td>${c.Nome}</td><td>${c.Tipo}</td><td><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${c.Cor||'#ccc'}"></span></td>
    <td><span class="badge ${c.Ativo==='Sim'?'Liquidado':'Vencido'}">${c.Ativo}</span></td>
    <td class="actions-cell">${acoesCadastro('Categorias', c.ID)}</td></tr>`).join('') || linhaVazia(5);

  document.getElementById('tbl-ContasBancarias').innerHTML = DB.ContasBancarias.map(c=>`<tr>
    <td>${c.NomeBanco}</td><td>${c.TipoConta}</td><td>${fmtMoeda(c.SaldoInicial)}</td>
    <td><span class="badge ${c.Ativo==='Sim'?'Liquidado':'Vencido'}">${c.Ativo}</span></td>
    <td class="actions-cell">${acoesCadastro('ContasBancarias', c.ID)}</td></tr>`).join('') || linhaVazia(5);

  document.getElementById('tbl-CartoesCredito').innerHTML = DB.CartoesCredito.map(c=>`<tr>
    <td>${c.NomeCartao}</td><td>${c.ContaBancariaVinculada}</td><td>${c.DiaFechamento}</td><td>${c.DiaVencimento}</td>
    <td><span class="badge ${c.Ativo==='Sim'?'Liquidado':'Vencido'}">${c.Ativo}</span></td>
    <td class="actions-cell">${acoesCadastro('CartoesCredito', c.ID)}</td></tr>`).join('') || linhaVazia(6);
}
function linhaVazia(cols){ return `<tr><td colspan="${cols}" class="empty-msg">Nenhum registro cadastrado.</td></tr>`; }
function acoesCadastro(sheet, id){
  return `<button class="icon-btn" title="Editar" onclick="editarCadastro('${sheet}','${id}')"><i class="fa-solid fa-pen"></i></button>
  <button class="icon-btn del" title="Excluir" onclick="excluirCadastro('${sheet}','${id}')"><i class="fa-solid fa-trash"></i></button>`;
}

function camposHtml(sheet, valores){
  valores = valores || {};
  return FORM_CONFIGS[sheet].map(f=>{
    let inputHtml = '';
    const val = valores[f.name] !== undefined ? valores[f.name] : (f.default||'');
    if(f.type==='select'){
      let opts = f.options || (DB[f.optionsFrom]||[]).map(o=>o[f.field]);
      inputHtml = `<select id="cf_${f.name}" ${f.required?'required':''}>${opts.map(o=>`<option value="${o}" ${o===val?'selected':''}>${o}</option>`).join('')}</select>`;
    } else {
      inputHtml = `<input type="${f.type}" id="cf_${f.name}" value="${val}" ${f.required?'required':''}>`;
    }
    return `<div class="form-group"><label>${f.label}${f.required?' *':''}</label>${inputHtml}</div>`;
  }).join('');
}

function abrirFormCadastro(sheet){
  document.getElementById('cID').value = '';
  document.getElementById('cSheet').value = sheet;
  document.getElementById('modalCadastroTitle').textContent = 'Novo registro';
  document.getElementById('camposCadastro').innerHTML = camposHtml(sheet);
  abrirModal('modalCadastro');
}

function editarCadastro(sheet, id){
  const item = DB[sheet].find(x=>x.ID===id);
  if(!item) return;
  document.getElementById('cID').value = id;
  document.getElementById('cSheet').value = sheet;
  document.getElementById('modalCadastroTitle').textContent = 'Editar registro';
  document.getElementById('camposCadastro').innerHTML = camposHtml(sheet, item);
  abrirModal('modalCadastro');
}

async function salvarCadastro(ev){
  ev.preventDefault();
  const sheet = document.getElementById('cSheet').value;
  const id = document.getElementById('cID').value;
  const data = {};
  FORM_CONFIGS[sheet].forEach(f=> data[f.name] = document.getElementById('cf_'+f.name).value);
  if(id){
    data.ID = id;
    await apiPost('update', sheet, data);
  } else {
    await apiPost('create', sheet, data);
  }
  fecharModal('modalCadastro');
  showToast('Registro salvo!');
  carregarTudo();
}

async function excluirCadastro(sheet, id){
  const item = DB[sheet].find(x=>x.ID===id);
  const nomeCampo = item.Nome || item.NomeBanco || item.NomeCartao;
  const emUso = DB.Lancamentos.some(l=> l.ClienteFornecedor===nomeCampo || l.Categoria===nomeCampo || l.ContaBancaria===nomeCampo || l.CartaoCredito===nomeCampo);
  if(emUso){ showToast('Não é possível excluir: existem lançamentos associados.', true); return; }
  if(!confirm('Excluir este registro?')) return;
  await apiPost('delete', sheet, {ID:id});
  showToast('Registro excluído.');
  carregarTudo();
}

// ===================== RELATÓRIO PDF =====================
function gerarPDF(){
  const mes = document.getElementById('rMes').value;
  const ano = document.getElementById('rAno').value;
  const tipo = document.getElementById('rTipo').value;

  let lista = DB.Lancamentos.filter(l=>{
    if(mes && !filtraMesAno(l.DataCompra, mes, null)) return false;
    if(ano && !filtraMesAno(l.DataCompra, null, ano)) return false;
    if(tipo && l.Tipo!==tipo) return false;
    return true;
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setTextColor(30,58,138);
  doc.text('Fluxo de Caixa Pessoal - Relatório', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  const periodo = (mes ? MESES[mes-1] : 'Todos os meses') + ' / ' + (ano || 'Todos os anos');
  doc.text('Período: ' + periodo, 14, 25);

  const total = lista.reduce((s,l)=>s + (l.Tipo==='Receita'?1:-1)*Number(l.ValorTotal||0), 0);
  doc.text('Total líquido do período: ' + fmtMoeda(total), 14, 31);

  doc.autoTable({
    startY: 38,
    head: [['Data','Fornecedor/Cliente','Categoria','Tipo','Valor','Status']],
    body: lista.map(l=>[formatarData(l.DataCompra), l.ClienteFornecedor, l.Categoria, l.Tipo, fmtMoeda(l.ValorTotal), l.Status]),
    headStyles: { fillColor: [30,58,138] },
    styles: { fontSize: 8 }
  });

  const porCategoria = {};
  lista.forEach(l=>{ porCategoria[l.Categoria] = (porCategoria[l.Categoria]||0) + Number(l.ValorTotal||0); });
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Categoria','Total']],
    body: Object.entries(porCategoria).map(([k,v])=>[k, fmtMoeda(v)]),
    headStyles: { fillColor: [96,165,250] },
    styles: { fontSize: 8 }
  });

  doc.save('relatorio-fluxo-caixa.pdf');
}
