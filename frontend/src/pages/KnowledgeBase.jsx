import React, { useState, useEffect } from 'react';
import './KnowledgeBase.css';

const categorias = [
  ['geral', 'Geral'],
  ['produto', 'Produto'],
  ['preco', 'Preco'],
  ['integracao', 'Integracao'],
  ['faq', 'FAQ'],
  ['caso-uso', 'Caso de Uso']
];

export default function KnowledgeBase() {
  const [materiais, setMateriais] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mostraNovo, setMostraNovo] = useState(false);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [arquivos, setArquivos] = useState([]);

  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    categoria: 'geral',
    palavrasChave: ''
  });

  useEffect(() => {
    carregarMateriais();
  }, []);

  const carregarMateriais = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      setMateriais(data.materiais || []);
      setStats(data.stats);
      setErro('');
    } catch (err) {
      setErro('Erro ao carregar materiais: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const limparForm = () => {
    setFormData({ titulo: '', conteudo: '', categoria: 'geral', palavrasChave: '' });
    setEditando(null);
    setMostraNovo(false);
  };

  const salvarMaterial = async (e) => {
    e.preventDefault();

    if (!formData.titulo.trim() || !formData.conteudo.trim()) {
      setErro('Titulo e conteudo sao obrigatorios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        palavrasChave: formData.palavrasChave.split(',').map(p => p.trim()).filter(Boolean)
      };

      const url = editando ? `/api/knowledge/${editando}` : '/api/knowledge';
      const metodo = editando ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Erro ao salvar material');

      setSucesso(editando ? 'Material atualizado!' : 'Material adicionado!');
      setTimeout(() => setSucesso(''), 3000);
      limparForm();
      carregarMateriais();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  const importarArquivos = async () => {
    if (arquivos.length === 0) {
      setErro('Selecione pelo menos um arquivo para importar');
      return;
    }

    setImportando(true);
    setErro('');
    setSucesso('');

    try {
      const form = new FormData();
      arquivos.forEach((arquivo) => form.append('arquivos', arquivo));

      const res = await fetch('/api/knowledge/import', {
        method: 'POST',
        body: form
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.erro || 'Erro ao importar arquivos');

      const rejeitados = data.rejeitados?.length
        ? ` (${data.rejeitados.length} arquivo(s) ignorado(s))`
        : '';
      setSucesso(`${data.importados} material(is) criado(s) a partir dos arquivos${rejeitados}.`);
      setArquivos([]);
      carregarMateriais();
    } catch (err) {
      setErro(err.message);
    } finally {
      setImportando(false);
    }
  };

  const editarMaterial = (material) => {
    setFormData({
      titulo: material.titulo,
      conteudo: material.conteudo,
      categoria: material.categoria,
      palavrasChave: material.palavrasChave?.join(', ') || ''
    });
    setEditando(material.id);
    setMostraNovo(true);
  };

  const deletarMaterial = async (id) => {
    if (!confirm('Tem certeza que quer deletar este material?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao deletar');

      setSucesso('Material deletado!');
      setTimeout(() => setSucesso(''), 3000);
      carregarMateriais();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buscarMateriais = async () => {
    if (!busca.trim()) {
      carregarMateriais();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(busca)}`);
      const data = await res.json();
      setMateriais(data.resultados || []);
    } catch (err) {
      setErro('Erro na busca: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const materialsFiltrados = materiais.filter(m => {
    const termo = busca.toLowerCase();
    return (
      m.titulo.toLowerCase().includes(termo) ||
      m.conteudo.toLowerCase().includes(termo) ||
      m.categoria.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="knowledge-base-container">
      <header className="kb-header">
        <div>
          <h1>Base de Conhecimento</h1>
          <p>Materiais sobre produtos, servicos e conhecimento para o bot</p>
        </div>
        <button className="btn-novo" onClick={() => { limparForm(); setMostraNovo(!mostraNovo); }}>
          Novo Material
        </button>
      </header>

      {erro && <div className="alert alert-error">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      {stats && (
        <div className="kb-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalMateriais}</div>
            <div className="stat-label">Materiais</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Object.keys(stats.categorias || {}).length}</div>
            <div className="stat-label">Categorias</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ultima atualizacao</div>
            <div className="stat-value-small">
              {stats.ultimaAtualizacao ? new Date(stats.ultimaAtualizacao).toLocaleDateString('pt-BR') : 'Nunca'}
            </div>
          </div>
        </div>
      )}

      <section className="kb-import">
        <div>
          <h2>Importar arquivos</h2>
          <p>Envie DOC, DOCX, PPT, PPTX, CSV, TXT, MD, JSON, HTML, XLS ou XLSX. O sistema extrai o conteudo e cria materiais categorizados.</p>
        </div>
        <div className="import-controls">
          <label className="file-picker">
            <input
              type="file"
              multiple
              accept=".doc,.docx,.ppt,.pptx,.csv,.txt,.md,.json,.html,.xls,.xlsx"
              onChange={(e) => setArquivos(Array.from(e.target.files || []))}
            />
            Selecionar arquivos
          </label>
          <button className="btn-importar" onClick={importarArquivos} disabled={importando || arquivos.length === 0}>
            {importando ? 'Importando...' : 'Importar'}
          </button>
        </div>
        {arquivos.length > 0 && (
          <div className="selected-files">
            {arquivos.map((arquivo) => (
              <span key={`${arquivo.name}-${arquivo.size}`}>{arquivo.name}</span>
            ))}
          </div>
        )}
      </section>

      {mostraNovo && (
        <div className="kb-form-container">
          <h2>{editando ? 'Editar Material' : 'Adicionar Novo Material'}</h2>
          <form onSubmit={salvarMaterial}>
            <div className="form-group">
              <label>Titulo *</label>
              <input type="text" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ex: Funcionalidades do FechaPro" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Categoria</label>
                <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}>
                  {categorias.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Palavras-chave</label>
                <input type="text" value={formData.palavrasChave} onChange={(e) => setFormData({ ...formData, palavrasChave: e.target.value })} placeholder="Ex: orcamento, proposta, venda" />
              </div>
            </div>

            <div className="form-group">
              <label>Conteudo *</label>
              <textarea value={formData.conteudo} onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })} placeholder="Descreva o material de conhecimento aqui..." rows="8" />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-salvar" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Material'}</button>
              <button type="button" className="btn-cancelar" onClick={limparForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="kb-search">
        <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarMateriais()} placeholder="Buscar materiais..." className="search-input" />
        <button onClick={buscarMateriais} className="btn-buscar">Buscar</button>
        {busca && <button onClick={() => { setBusca(''); carregarMateriais(); }} className="btn-limpar">Limpar</button>}
      </div>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : materialsFiltrados.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum material encontrado</p>
          <p className="text-muted">Comece adicionando um novo material ou importando arquivos acima.</p>
        </div>
      ) : (
        <div className="kb-grid">
          {materialsFiltrados.map((material) => (
            <div key={material.id} className="kb-card">
              <div className="card-header">
                <h3>{material.titulo}</h3>
                <span className={`badge badge-${material.categoria}`}>{material.categoria}</span>
              </div>

              <p className="card-content">{material.conteudo.substring(0, 150)}...</p>

              {material.palavrasChave?.length > 0 && (
                <div className="card-tags">
                  {material.palavrasChave.map((palavra, idx) => <span key={idx} className="tag">#{palavra}</span>)}
                </div>
              )}

              <div className="card-meta">
                <small>{new Date(material.atualizado).toLocaleDateString('pt-BR')}</small>
                {material.origem && <small>Origem: {material.origem}</small>}
              </div>

              <div className="card-actions">
                <button className="btn-editar" onClick={() => editarMaterial(material)}>Editar</button>
                <button className="btn-deletar" onClick={() => deletarMaterial(material.id)}>Deletar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
