// export <in.png> <out-base> <size> — writes <out-base>.avif and <out-base>.png (transparent, resized)
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let n = Int(a[3])!
let ctx = CGContext(data: nil, width: n, height: n, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.interpolationQuality = .high
ctx.draw(img, in: CGRect(x: 0, y: 0, width: n, height: n))
let out = ctx.makeImage()!
for (ext, type, q) in [("avif", "public.avif", 0.62), ("png", UTType.png.identifier, 1.0)] {
  let url = URL(fileURLWithPath: a[2] + "." + ext)
  let d = CGImageDestinationCreateWithURL(url as CFURL, type as CFString, 1, nil)!
  CGImageDestinationAddImage(d, out, [kCGImageDestinationLossyCompressionQuality: q] as CFDictionary)
  CGImageDestinationFinalize(d)
}
