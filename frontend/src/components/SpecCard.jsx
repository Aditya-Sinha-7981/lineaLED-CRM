export default function SpecCard({ spec, boardType }) {
  if (!spec) return null

  if (boardType === 'video_wall') {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-sm">
        <p className="text-xs text-gray-400 uppercase font-medium mb-3">Calculated Spec</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <span className="text-gray-400">Actual Size</span>
            <p className="font-medium">{spec.actualWidthFt} ft × {spec.actualHeightFt} ft</p>
          </div>
          <div>
            <span className="text-gray-400">Modules</span>
            <p className="font-medium">{spec.totalModules}</p>
          </div>
          <div>
            <span className="text-gray-400">Resolution</span>
            <p className="font-medium">{spec.resolutionPx.width} × {spec.resolutionPx.height} px</p>
          </div>
          <div>
            <span className="text-gray-400">Total Pixels</span>
            <p className="font-medium">{spec.totalPixelCount.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <span className="text-gray-400">Controller</span>
            <p className="font-medium text-orange-600">{spec.controllerModel}</p>
          </div>
          <div>
            <span className="text-gray-400">Cabinet Type</span>
            <p className="font-medium">{spec.cabinetType}</p>
          </div>
        </div>
      </div>
    )
  }

  if (boardType === 'gsb_signage') {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-sm">
        <p className="text-xs text-gray-400 uppercase font-medium mb-3">Calculated Spec</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <span className="text-gray-400">Total Modules</span>
            <p className="font-medium">{spec.totalModules}</p>
          </div>
          <div>
            <span className="text-gray-400">Modules/Row</span>
            <p className="font-medium">{spec.modulesPerRow}</p>
          </div>
          <div>
            <span className="text-gray-400">Rows</span>
            <p className="font-medium">{spec.numRows}</p>
          </div>
          <div>
            <span className="text-gray-400">Total Wattage</span>
            <p className="font-medium">{spec.totalWattage}W</p>
          </div>
          <div>
            <span className="text-gray-400">Min. SMPS</span>
            <p className="font-medium text-orange-600">{spec.minSmpsWatts}W</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}