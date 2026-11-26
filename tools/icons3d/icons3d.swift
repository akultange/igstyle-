// 3D metallic icon renderer (SceneKit, offline).
// icons3d <spec.json> <outDir> [size=1024] [only=name]
// Each icon is a list of parts in a 100x100 "viewBox" (y down, like SVG):
//   path      — SVG path data (M L H V C S Q T Z), optional stroke width (stroked to an outline),
//               extruded `depth` with a rounded bevel `chamfer`; evenodd holes supported
//   sphere / cylinder / cone / torus / capsule / box / text — SceneKit primitives
// Materials: chrome (polished silver), crimson (lacquered red), dark (black chrome), facets (mirror ball)
import AppKit
import SceneKit
import CoreGraphics

struct Part: Decodable {
  var type: String
  var d: String?; var stroke: Double?; var evenodd: Bool?
  var depth: Double?; var chamfer: Double?
  var r: Double?; var r2: Double?; var h: Double?; var pipe: Double?; var w: Double?; var l: Double?
  var text: String?; var font: String?; var size: Double?
  var pos: [Double]?; var rot: [Double]?; var scale: [Double]?
  var mat: String?; var facets: Double?
}
struct Icon: Decodable { var name: String; var parts: [Part]; var tilt: [Double]?; var zoom: Double? }

let A = CommandLine.arguments
let specURL = URL(fileURLWithPath: A[1]), outDir = URL(fileURLWithPath: A[2])
let px = A.count > 3 ? Int(A[3])! : 1024
let only = A.count > 4 ? A[4] : nil
let icons = try! JSONDecoder().decode([Icon].self, from: Data(contentsOf: specURL))
let S: CGFloat = 0.01 // viewBox unit -> scene unit

// MARK: SVG path subset -> CGPath
func parsePath(_ d: String) -> CGMutablePath {
  let path = CGMutablePath()
  var toks: [String] = []; var cur = ""
  func flush() { if !cur.isEmpty { toks.append(cur); cur = "" } }
  for ch in d {
    if "MmLlHhVvCcSsQqTtZz".contains(ch) { flush(); toks.append(String(ch)) }
    else if ch == "," || ch == " " || ch == "\n" || ch == "\t" { flush() }
    else if ch == "-" { if !cur.isEmpty && cur.last != "e" { flush() }; cur.append(ch) }
    else if ch == "." { if cur.contains(".") { flush() }; cur.append(ch) }
    else { cur.append(ch) }
  }
  flush()
  var i = 0, cmd: Character = "M"
  var p = CGPoint.zero, start = CGPoint.zero
  var lc: CGPoint? = nil, lq: CGPoint? = nil
  func n() -> CGFloat { defer { i += 1 }; return CGFloat(Double(toks[i]) ?? 0) }
  while i < toks.count {
    if toks[i].count == 1, let c = toks[i].first, "MmLlHhVvCcSsQqTtZz".contains(c) {
      cmd = c; i += 1
      if c == "Z" || c == "z" { path.closeSubpath(); p = start; lc = nil; lq = nil; continue }
    }
    let rel = cmd.isLowercase
    let o = rel ? p : .zero
    switch cmd {
    case "M", "m": p = CGPoint(x: n() + o.x, y: n() + o.y); start = p; path.move(to: p); cmd = rel ? "l" : "L"; lc = nil; lq = nil
    case "L", "l": p = CGPoint(x: n() + o.x, y: n() + o.y); path.addLine(to: p); lc = nil; lq = nil
    case "H", "h": p = CGPoint(x: n() + o.x, y: p.y); path.addLine(to: p); lc = nil; lq = nil
    case "V", "v": p = CGPoint(x: p.x, y: n() + o.y); path.addLine(to: p); lc = nil; lq = nil
    case "C", "c":
      let c1 = CGPoint(x: n() + o.x, y: n() + o.y), c2 = CGPoint(x: n() + o.x, y: n() + o.y), e = CGPoint(x: n() + o.x, y: n() + o.y)
      path.addCurve(to: e, control1: c1, control2: c2); lc = c2; lq = nil; p = e
    case "S", "s":
      let c2 = CGPoint(x: n() + o.x, y: n() + o.y), e = CGPoint(x: n() + o.x, y: n() + o.y)
      let c1 = lc.map { CGPoint(x: 2 * p.x - $0.x, y: 2 * p.y - $0.y) } ?? p
      path.addCurve(to: e, control1: c1, control2: c2); lc = c2; lq = nil; p = e
    case "Q", "q":
      let c = CGPoint(x: n() + o.x, y: n() + o.y), e = CGPoint(x: n() + o.x, y: n() + o.y)
      path.addQuadCurve(to: e, control: c); lq = c; lc = nil; p = e
    case "T", "t":
      let e = CGPoint(x: n() + o.x, y: n() + o.y)
      let c = lq.map { CGPoint(x: 2 * p.x - $0.x, y: 2 * p.y - $0.y) } ?? p
      path.addQuadCurve(to: e, control: c); lq = c; lc = nil; p = e
    default: i += 1
    }
  }
  return path
}

// MARK: studio environment (equirectangular): bright sky, chrome horizon, dark floor, softboxes
func makeEnvironment() -> CGImage {
  let W = 2048, H = 1024
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.translateBy(x: 0, y: CGFloat(H)); ctx.scaleBy(x: 1, y: -1) // y down
  let g = CGGradient(colorsSpace: cs, colors: [
    CGColor(red: 0.16, green: 0.16, blue: 0.18, alpha: 1), CGColor(red: 0.55, green: 0.56, blue: 0.6, alpha: 1),
    CGColor(red: 0.95, green: 0.95, blue: 0.97, alpha: 1), CGColor(red: 0.08, green: 0.08, blue: 0.09, alpha: 1),
    CGColor(red: 0.02, green: 0.02, blue: 0.02, alpha: 1)] as CFArray, locations: [0, 0.4, 0.49, 0.53, 1])!
  ctx.drawLinearGradient(g, start: .zero, end: CGPoint(x: 0, y: H), options: [])
  func softbox(_ u: CGFloat, _ v: CGFloat, _ w: CGFloat, _ h: CGFloat, _ c: CGColor) {
    let r = CGRect(x: (u - w / 2) * CGFloat(W), y: (v - h / 2) * CGFloat(H), width: w * CGFloat(W), height: h * CGFloat(H))
    ctx.saveGState(); ctx.addPath(CGPath(roundedRect: r, cornerWidth: 18, cornerHeight: 18, transform: nil)); ctx.clip()
    let sg = CGGradient(colorsSpace: cs, colors: [c, c.copy(alpha: 0.75)!] as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(sg, start: CGPoint(x: r.midX, y: r.minY), end: CGPoint(x: r.midX, y: r.maxY), options: [])
    ctx.restoreGState()
  }
  let white = CGColor(red: 1, green: 1, blue: 1, alpha: 1)
  softbox(0.10, 0.30, 0.07, 0.26, white); softbox(0.36, 0.24, 0.05, 0.3, white)
  softbox(0.62, 0.30, 0.08, 0.22, white); softbox(0.86, 0.26, 0.04, 0.3, white)
  softbox(0.24, 0.42, 0.22, 0.03, white)
  softbox(0.74, 0.62, 0.10, 0.10, CGColor(red: 0.55, green: 0.04, blue: 0.11, alpha: 1)) // a crimson bounce
  // big panels behind the camera, so flat chrome faces catch a bright, graded reflection
  for u in [0.5, 0.0, 1.0, 0.25, 0.75] as [CGFloat] {
    let r = CGRect(x: (u - 0.09) * CGFloat(W), y: 0.30 * CGFloat(H), width: 0.18 * CGFloat(W), height: 0.40 * CGFloat(H))
    ctx.saveGState(); ctx.addPath(CGPath(roundedRect: r, cornerWidth: 40, cornerHeight: 40, transform: nil)); ctx.clip()
    let pg = CGGradient(colorsSpace: cs, colors: [CGColor(red: 1, green: 1, blue: 1, alpha: 0.95), CGColor(red: 0.62, green: 0.63, blue: 0.66, alpha: 0.9), CGColor(red: 0.2, green: 0.2, blue: 0.22, alpha: 0.9)] as CFArray, locations: [0, 0.55, 1])!
    ctx.drawLinearGradient(pg, start: CGPoint(x: r.minX, y: r.minY), end: CGPoint(x: r.maxX, y: r.maxY), options: [])
    ctx.restoreGState()
  }
  return ctx.makeImage()!
}

// MARK: mirror-ball facets as a normal map
func facetMap(cells: Int) -> CGImage {
  let W = 2048, H = 1024, cw = W / cells, ch = H / (cells / 2)
  var buf = [UInt8](repeating: 0, count: W * H * 4)
  var seed: UInt64 = 7
  func rnd() -> Double { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return Double(seed >> 11) / Double(1 << 53) }
  var tilt = [(Double, Double)]()
  for _ in 0..<(cells * cells) { tilt.append(((rnd() - 0.5) * 0.36, (rnd() - 0.5) * 0.36)) }
  for y in 0..<H { for x in 0..<W {
    let cx = x / cw, cy = y / ch, fx = x % cw, fy = y % ch
    var (nx, ny) = tilt[(cy * cells + cx) % tilt.count]
    if fx < 2 || fy < 2 { nx = fx < 2 ? -0.7 : nx; ny = fy < 2 ? -0.7 : ny } // grout
    let nz = max(0.05, (1 - nx * nx - ny * ny).squareRoot())
    let i = (y * W + x) * 4
    buf[i] = UInt8((nx * 0.5 + 0.5) * 255); buf[i + 1] = UInt8((ny * 0.5 + 0.5) * 255); buf[i + 2] = UInt8(nz * 255); buf[i + 3] = 255
  } }
  let cs = CGColorSpaceCreateDeviceRGB()
  return CGImage(width: W, height: H, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: W * 4, space: cs,
                 bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
                 provider: CGDataProvider(data: Data(buf) as CFData)!, decode: nil, shouldInterpolate: true, intent: .defaultIntent)!
}

let env = makeEnvironment()
var facetCache: [Int: CGImage] = [:]

func material(_ name: String?, facets: Double?) -> SCNMaterial {
  let m = SCNMaterial(); m.lightingModel = .physicallyBased
  switch name ?? "chrome" {
  case "crimson":
    m.diffuse.contents = NSColor(srgbRed: 0.78, green: 0.03, blue: 0.14, alpha: 1)
    m.metalness.contents = 0.45; m.roughness.contents = 0.2
    m.clearCoat.contents = 1.0; m.clearCoatRoughness.contents = 0.03
  case "dark":
    m.diffuse.contents = NSColor(white: 0.18, alpha: 1); m.metalness.contents = 1.0; m.roughness.contents = 0.22
  default:
    m.diffuse.contents = NSColor(white: 0.93, alpha: 1); m.metalness.contents = 1.0; m.roughness.contents = 0.13
  }
  if let f = facets {
    let k = Int(f); if facetCache[k] == nil { facetCache[k] = facetMap(cells: k) }
    m.normal.contents = facetCache[k]; m.roughness.contents = 0.08
  }
  return m
}

func roundProfile() -> NSBezierPath {
  let p = NSBezierPath(); p.move(to: NSPoint(x: 0, y: 1))
  p.curve(to: NSPoint(x: 1, y: 0), controlPoint1: NSPoint(x: 0.56, y: 1), controlPoint2: NSPoint(x: 1, y: 0.56))
  return p
}

func geometry(_ p: Part) -> SCNGeometry {
  switch p.type {
  case "path":
    var cg: CGPath = parsePath(p.d ?? "")
    if let sw = p.stroke { cg = cg.copy(strokingWithWidth: CGFloat(sw), lineCap: .round, lineJoin: .round, miterLimit: 4) }
    var t = CGAffineTransform(a: S, b: 0, c: 0, d: -S, tx: -50 * S, ty: 50 * S)
    let flipped = cg.copy(using: &t)!
    let bz = NSBezierPath(cgPath: flipped)
    bz.flatness = 0.0015
    bz.windingRule = (p.evenodd ?? false) ? .evenOdd : .nonZero
    let s = SCNShape(path: bz, extrusionDepth: CGFloat(p.depth ?? 10) * S)
    let c = CGFloat(p.chamfer ?? 2) * S
    if c > 0 { s.chamferRadius = c; s.chamferMode = .both; s.chamferProfile = roundProfile() }
    return s
  case "sphere": let g = SCNSphere(radius: CGFloat(p.r ?? 10) * S); g.segmentCount = 120; return g
  case "cylinder": let g = SCNCylinder(radius: CGFloat(p.r ?? 5) * S, height: CGFloat(p.h ?? 20) * S); g.radialSegmentCount = 96; return g
  case "cone": let g = SCNCone(topRadius: CGFloat(p.r ?? 5) * S, bottomRadius: CGFloat(p.r2 ?? 3) * S, height: CGFloat(p.h ?? 20) * S); g.radialSegmentCount = 96; return g
  case "torus": let g = SCNTorus(ringRadius: CGFloat(p.r ?? 10) * S, pipeRadius: CGFloat(p.pipe ?? 2) * S); g.ringSegmentCount = 120; g.pipeSegmentCount = 48; return g
  case "capsule": let g = SCNCapsule(capRadius: CGFloat(p.r ?? 5) * S, height: CGFloat(p.h ?? 20) * S); g.radialSegmentCount = 96; return g
  case "box": return SCNBox(width: CGFloat(p.w ?? 10) * S, height: CGFloat(p.h ?? 10) * S, length: CGFloat(p.l ?? 10) * S, chamferRadius: CGFloat(p.chamfer ?? 1) * S)
  case "text":
    let g = SCNText(string: p.text ?? "", extrusionDepth: CGFloat(p.depth ?? 8) * S)
    g.font = NSFont(name: p.font ?? "Didot-Bold", size: CGFloat(p.size ?? 40) * S) ?? NSFont.boldSystemFont(ofSize: CGFloat(p.size ?? 40) * S)
    g.flatness = 0.0008; g.chamferRadius = CGFloat(p.chamfer ?? 1) * S; g.chamferProfile = roundProfile()
    return g
  default: return SCNSphere(radius: 0.01)
  }
}

func render(_ icon: Icon) {
  let scene = SCNScene()
  scene.background.contents = NSColor.clear
  scene.lightingEnvironment.contents = env
  scene.lightingEnvironment.intensity = 1.6
  let holder = SCNNode(); scene.rootNode.addChildNode(holder)
  for p in icon.parts {
    let g = geometry(p)
    g.materials = [material(p.mat, facets: p.facets)]
    let node = SCNNode(geometry: g)
    if p.type == "text" { // centre text on its bounding box
      let (mn, mx) = g.boundingBox
      node.pivot = SCNMatrix4MakeTranslation((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2)
    }
    if p.type == "path" { node.position.z -= CGFloat(p.depth ?? 10) * S / 2 * 0 }
    let ps = p.pos ?? [50, 50, 0]
    node.position = SCNVector3((CGFloat(ps[0]) - 50) * S, (50 - CGFloat(ps[1])) * S, CGFloat(ps.count > 2 ? ps[2] : 0) * S)
    if p.type == "path" && p.pos == nil { node.position = SCNVector3(0, 0, 0) }
    if let r = p.rot { node.eulerAngles = SCNVector3(CGFloat(r[0]) * .pi / 180, CGFloat(r[1]) * .pi / 180, CGFloat(r[2]) * .pi / 180) }
    if let sc = p.scale { node.scale = SCNVector3(CGFloat(sc[0]), CGFloat(sc[1]), CGFloat(sc.count > 2 ? sc[2] : sc[0])) }
    holder.addChildNode(node)
  }
  let tilt = icon.tilt ?? [10, -24, 0]
  holder.eulerAngles = SCNVector3(CGFloat(tilt[0]) * .pi / 180, CGFloat(tilt[1]) * .pi / 180, CGFloat(tilt[2]) * .pi / 180)

  let key = SCNLight(); key.type = .directional; key.intensity = 900; key.color = NSColor.white
  let keyNode = SCNNode(); keyNode.light = key; keyNode.eulerAngles = SCNVector3(-0.7, -0.5, 0); scene.rootNode.addChildNode(keyNode)
  let rim = SCNLight(); rim.type = .directional; rim.intensity = 500; rim.color = NSColor(srgbRed: 1, green: 0.45, blue: 0.5, alpha: 1)
  let rimNode = SCNNode(); rimNode.light = rim; rimNode.eulerAngles = SCNVector3(0.3, 2.6, 0); scene.rootNode.addChildNode(rimNode)

  let cam = SCNCamera(); cam.fieldOfView = 20; cam.zNear = 0.1; cam.zFar = 50
  cam.wantsHDR = true; cam.exposureOffset = 0.15; cam.wantsExposureAdaptation = false
  cam.bloomIntensity = 0; cam.whitePoint = 1.1
  let camNode = SCNNode(); camNode.camera = cam
  camNode.position = SCNVector3(0, 0, 3.35 / CGFloat(icon.zoom ?? 1)); scene.rootNode.addChildNode(camNode)

  let r = SCNRenderer(device: MTLCreateSystemDefaultDevice(), options: nil)
  r.scene = scene; r.pointOfView = camNode; r.autoenablesDefaultLighting = false
  let img = r.snapshot(atTime: 0, with: CGSize(width: px, height: px), antialiasingMode: .multisampling4X)
  guard let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) else { print("render failed", icon.name); return }
  let url = outDir.appendingPathComponent("\(icon.name).png")
  try! png.write(to: url)
  print("rendered \(icon.name) \(rep.pixelsWide)x\(rep.pixelsHigh) alpha:\(rep.hasAlpha)")
}

try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
for icon in icons where only == nil || icon.name == only { render(icon) }
