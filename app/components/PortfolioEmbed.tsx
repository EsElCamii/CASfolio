export default function PortfolioEmbed() {
  return (
    <div className="card" style={{ padding: 0 }}>
      <iframe
        src="/index.html"
        title="CASfolio Portfolio"
        style={{
          width: '100%',
          minHeight: '80vh',
          border: '0',
          borderRadius: 'inherit',
        }}
        loading="lazy"
      />
    </div>
  );
}
