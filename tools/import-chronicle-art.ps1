$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assets = [ordered]@{
  'founding.png'      = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_145444_c0881289-43c2-4ff6-bacc-678e725888af.png'
  'season-spring.png' = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140227_c0eec5fd-cd3a-4289-83e3-0be5eba33425.png'
  'season-summer.png' = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140227_262ab38a-6112-4b2b-af71-f26e5cbff45b.png'
  'season-autumn.png' = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140227_b39701ca-10eb-4b65-afdf-228899d2fb65.png'
  'season-winter.png' = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140227_8ee6a01e-e121-41ce-9922-003e13c3fcb1.png'
  'birth.png'         = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_145443_a9d78998-866b-457d-972e-38d9ed069fbf.png'
  'death.png'         = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_135838_2351645b-ab06-4baf-8632-1ed5fad21e6c.png'
  'harvest.png'       = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140227_91140e72-9352-4e24-9aa1-2aa6d0914e2a.png'
  'famine.png'        = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140228_f5cc1000-3083-4549-9271-cb4ba5b25815.png'
  'plague.png'        = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140448_e4549a00-d8fb-4196-88b7-e4c9c4fb87b6.png'
  'fire.png'          = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140450_7f3a971c-2d84-4b06-a8da-7207e8910b3d.png'
  'built.png'         = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140448_21b70a54-f5d8-4d06-a050-91f35c39c594.png'
  'lost.png'          = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140449_908c9fa8-37e4-4f26-881c-1112b54566eb.png'
  'road.png'          = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140449_97b0e602-efe3-46be-bc31-3d1e4a734a83.png'
  'grudge.png'        = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_135838_5bed38dc-d577-418d-8c65-956b236a75f0.png'
  'succession.png'    = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140449_0f44a4fe-1831-46fd-9a8f-ff272d9e53ab.png'
  'flood.png'         = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140624_9fb23021-326e-4345-8abd-5cd233cf5857.png'
  'wolf.png'          = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140623_8ed8bc83-5312-428e-bfe5-2f1a3c3c55a2.png'
  'wedding.png'       = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_135558_d36030c6-ded9-481c-a02d-741ef5ce933f.png'
  'pedlar.png'        = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140623_82cee7d8-5812-4a2d-87d6-1e26203e6995.png'
  'fish.png'          = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140623_9aeb9ea1-f6b3-4ed4-8c6c-0f179b36e105.png'
  'bear.png'          = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_140623_188e9ee2-f55e-4e52-aec9-5865a6e1d91d.png'
  'child.png'         = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_135838_4884a08f-7428-4417-ba35-0ce78fa81a38.png'
  'means-plough.png'  = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150246_e57c7043-f17f-4f59-a63a-c5e96710584f.png'
  'means-pigs.png'    = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150245_cd5a3a6d-de8f-4aa6-a388-75d43c8d11d3.png'
  'means-axe.png'     = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150246_5006fe0b-0298-4893-b3f7-12a3cfbfd851.png'
  'means-relic.png'   = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150245_bb089393-9e40-460d-b396-afdb6dfa3778.png'
  'means-arms.png'    = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150245_88288853-5b3f-491c-8d1b-fac84fb27662.png'
  'means-bows.png'    = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150245_4ba17fc8-a311-4dbf-b6bc-c72063dd6a15.png'
  'means-tower.png'   = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150258_69dd1b87-e419-4c27-9480-98013d1616e5.png'
  'means-gate.png'    = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150258_1c556d7f-b17e-4b6b-bc8a-7a942d3d64ad.png'
  'means-hand.png'    = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150346_be0ddc3e-7209-466f-a742-d2cd646c822b.png'
  'means-ale.png'     = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JTa9g7JnSDc1d7eYJn3ELIDEpE/hf_20260918_150258_bab983af-a985-4ca2-8d93-b23a31c75703.png'
}

$destination = Join-Path $PSScriptRoot '..\public\ui\art'
$scratch = Join-Path $PSScriptRoot '..\tmp\chronicle-import'
New-Item -ItemType Directory -Force -Path $destination, $scratch | Out-Null

foreach ($entry in $assets.GetEnumerator()) {
  $source = Join-Path $scratch $entry.Key
  $target = Join-Path $destination $entry.Key
  Invoke-WebRequest -Uri $entry.Value -OutFile $source
  $input = [System.Drawing.Image]::FromFile($source)
  try {
    $output = [System.Drawing.Bitmap]::new(640, 512)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($output)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($input, 0, 0, 640, 512)
      } finally { $graphics.Dispose() }
      $output.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $output.Dispose() }
  } finally { $input.Dispose() }
}

Write-Output "Imported $($assets.Count) chronicle images to $destination"
