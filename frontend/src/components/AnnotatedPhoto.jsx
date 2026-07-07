export default function AnnotatedPhoto({ photoUrl, annotation, imgClassName = 'max-w-full max-h-64 object-contain rounded-lg border' }) {
  if (!photoUrl) return null

  return (
    <div className="relative inline-block max-w-full">
      <img
        src={photoUrl}
        alt="Board"
        className={imgClassName}
        crossOrigin="anonymous"
      />
      {annotation && (
        <div
          className="absolute border-2 border-orange-500 bg-orange-500/20 pointer-events-none"
          style={{
            left: `${annotation.x_pct}%`,
            top: `${annotation.y_pct}%`,
            width: `${annotation.w_pct}%`,
            height: `${annotation.h_pct}%`,
          }}
        />
      )}
    </div>
  )
}
