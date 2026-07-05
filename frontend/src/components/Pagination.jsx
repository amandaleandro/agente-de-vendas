import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 50,
  onPageChange = () => {}
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    onPageChange(page);
  };

  // Gerar números de página para exibir
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      marginTop: '1.5rem',
      padding: '1rem',
      borderTop: '1px solid rgba(255,255,255,0.1)'
    }}>
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        style={{
          padding: '0.5rem 0.75rem',
          background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          color: currentPage === 1 ? 'var(--text-dim)' : 'white',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.9rem'
        }}
      >
        <ChevronLeft size={16} /> Anterior
      </button>

      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {pageNumbers.map((page, idx) => (
          page === '...' ? (
            <span key={`dots-${idx}`} style={{ padding: '0.5rem 0.25rem', color: 'var(--text-dim)' }}>
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                background: page === currentPage ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                border: page === currentPage ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: page === currentPage ? 'white' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: page === currentPage ? 'bold' : 'normal',
                fontSize: '0.9rem'
              }}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        style={{
          padding: '0.5rem 0.75rem',
          background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          color: currentPage === totalPages ? 'var(--text-dim)' : 'white',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.9rem'
        }}
      >
        Próxima <ChevronRight size={16} />
      </button>

      <div style={{
        marginLeft: '1rem',
        padding: '0.5rem 1rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '6px',
        fontSize: '0.9rem',
        color: 'var(--text-muted)'
      }}>
        Página {currentPage} de {totalPages} ({totalItems} items)
      </div>
    </div>
  );
}
