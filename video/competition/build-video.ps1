[CmdletBinding()]
param(
  [string]$Voice = "en-US-AndrewNeural",
  [string]$Rate = "+10%"
)

$ErrorActionPreference = "Stop"
$invariant = [System.Globalization.CultureInfo]::InvariantCulture
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = (Resolve-Path (Join-Path $scriptRoot "..\..")).Path
$imageRoot = Join-Path $repositoryRoot "image"
$narrationRoot = Join-Path $scriptRoot "narration"
$buildRoot = Join-Path $scriptRoot "build"
$outputVideo = Join-Path $scriptRoot "vertex-palace-build-week-demo-en.mp4"
$outputCaptions = Join-Path $scriptRoot "vertex-palace-build-week-demo-en.srt"
$outputManifest = Join-Path $scriptRoot "vertex-palace-build-week-demo-en.json"

foreach ($command in @("python", "ffmpeg", "ffprobe")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Required command is unavailable: $command"
  }
}

New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null

function Invoke-Checked {
  param(
    [Parameter(Mandatory)] [string]$Command,
    [Parameter(Mandatory)] [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command"
  }
}

function Get-MediaDuration {
  param([Parameter(Mandatory)] [string]$Path)

  $raw = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 -- $Path
  if ($LASTEXITCODE -ne 0) {
    throw "ffprobe failed for $Path"
  }
  return [double]::Parse($raw.Trim(), $invariant)
}

function ConvertFrom-SrtTime {
  param([Parameter(Mandatory)] [string]$Value)

  return [TimeSpan]::ParseExact($Value, "hh\:mm\:ss\,fff", $invariant)
}

function ConvertTo-SrtTime {
  param([Parameter(Mandatory)] [TimeSpan]$Value)

  $hours = [Math]::Floor($Value.TotalHours)
  return "{0:00}:{1:00}:{2:00},{3:000}" -f $hours, $Value.Minutes, $Value.Seconds, $Value.Milliseconds
}

function Convert-SrtWithOffset {
  param(
    [Parameter(Mandatory)] [string]$Path,
    [Parameter(Mandatory)] [TimeSpan]$Offset,
    [Parameter(Mandatory)] [int]$StartCueNumber
  )

  $content = [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8).Trim()
  if (-not $content) {
    return [pscustomobject]@{ Lines = [string[]]@(); CueCount = 0 }
  }

  $destination = [System.Collections.Generic.List[string]]::new()
  $cueNumber = $StartCueNumber
  foreach ($block in [Regex]::Split($content, "\r?\n\r?\n")) {
    $lines = [Regex]::Split($block.Trim(), "\r?\n")
    if ($lines.Count -lt 3 -or $lines[1] -notmatch "^(?<start>\d{2}:\d{2}:\d{2},\d{3}) --> (?<end>\d{2}:\d{2}:\d{2},\d{3})$") {
      throw "Unexpected SRT block in $Path"
    }

    $start = (ConvertFrom-SrtTime $Matches.start) + $Offset
    $end = (ConvertFrom-SrtTime $Matches.end) + $Offset
    $destination.Add([string]$cueNumber)
    $destination.Add("$(ConvertTo-SrtTime $start) --> $(ConvertTo-SrtTime $end)")
    foreach ($line in $lines[2..($lines.Count - 1)]) {
      $destination.Add($line)
    }
    $destination.Add("")
    $cueNumber += 1
  }

  return [pscustomobject]@{
    Lines = $destination.ToArray()
    CueCount = $cueNumber - $StartCueNumber
  }
}

$segmentReports = [System.Collections.Generic.List[object]]::new()
$masterCaptions = [System.Collections.Generic.List[string]]::new()
$cueNumber = 1
$offset = [TimeSpan]::Zero

Push-Location $buildRoot
try {
  foreach ($index in 1..7) {
    $id = "{0:D2}" -f $index
    $imagePath = Join-Path $imageRoot "$id.png"
    $textPath = Join-Path $narrationRoot "$id.txt"
    $audioPath = Join-Path $buildRoot "$id.mp3"
    $subtitlePath = Join-Path $buildRoot "$id.srt"
    $segmentPath = Join-Path $buildRoot "$id.mp4"

    foreach ($source in @($imagePath, $textPath)) {
      if (-not (Test-Path -LiteralPath $source)) {
        throw "Missing source file: $source"
      }
    }

    Invoke-Checked python @(
      "-m", "edge_tts",
      "--file", $textPath,
      "--voice", $Voice,
      "--rate", $Rate,
      "--write-media", $audioPath,
      "--write-subtitles", $subtitlePath
    )

    $audioDuration = Get-MediaDuration $audioPath
    $segmentTargetDuration = [Math]::Ceiling(($audioDuration + 0.55) * 1000) / 1000
    $videoFadeOut = [Math]::Max(0, $segmentTargetDuration - 0.35)
    $audioFadeOut = [Math]::Max(0, $audioDuration - 0.25)
    $durationText = $segmentTargetDuration.ToString("0.000", $invariant)
    $videoFadeText = $videoFadeOut.ToString("0.000", $invariant)
    $audioFadeText = $audioFadeOut.ToString("0.000", $invariant)

    $videoFilter = @(
      "[0:v]scale=1600:900:force_original_aspect_ratio=decrease",
      "pad=1920:1080:(ow-iw)/2:20:color=0x020b17",
      "drawbox=x=0:y=930:w=iw:h=150:color=0x020b17@0.92:t=fill",
      "subtitles=filename='$id.srt':force_style='FontName=Segoe UI,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00102030,BackColour=&H80020B17,BorderStyle=3,Outline=1,Shadow=0,Alignment=2,MarginV=28'",
      "fade=t=in:st=0:d=0.35",
      "fade=t=out:st=${videoFadeText}:d=0.35[v]"
    ) -join ","
    $audioFilter = "[1:a]afade=t=in:st=0:d=0.12,afade=t=out:st=${audioFadeText}:d=0.25,apad=pad_dur=0.55[a]"

    Invoke-Checked ffmpeg @(
      "-y", "-hide_banner", "-loglevel", "error",
      "-loop", "1", "-framerate", "30", "-i", $imagePath,
      "-i", $audioPath,
      "-filter_complex", "$videoFilter;$audioFilter",
      "-map", "[v]", "-map", "[a]",
      "-t", $durationText,
      "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-pix_fmt", "yuv420p", "-r", "30",
      "-c:a", "aac", "-b:a", "192k",
      $segmentPath
    )

    $segmentDuration = Get-MediaDuration $segmentPath
    $convertedCaptions = Convert-SrtWithOffset -Path $subtitlePath -Offset $offset -StartCueNumber $cueNumber
    foreach ($line in $convertedCaptions.Lines) {
      $masterCaptions.Add($line)
    }
    $cueNumber += $convertedCaptions.CueCount
    $segmentReports.Add([ordered]@{
      slide = $id
      image = "image/$id.png"
      narration = "video/competition/narration/$id.txt"
      audioDurationSeconds = [Math]::Round($audioDuration, 3)
      segmentDurationSeconds = [Math]::Round($segmentDuration, 3)
    })
    $offset += [TimeSpan]::FromSeconds($segmentDuration)
  }

  $concatLines = 1..7 | ForEach-Object { "file '{0:D2}.mp4'" -f $_ }
  [IO.File]::WriteAllLines((Join-Path $buildRoot "concat.txt"), $concatLines, $utf8NoBom)
  Invoke-Checked ffmpeg @(
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", "concat.txt",
    "-c", "copy", "-movflags", "+faststart",
    $outputVideo
  )
} finally {
  Pop-Location
}

if ($masterCaptions.Count -gt 0 -and $masterCaptions[$masterCaptions.Count - 1] -eq "") {
  $masterCaptions.RemoveAt($masterCaptions.Count - 1)
}
[IO.File]::WriteAllLines($outputCaptions, $masterCaptions, $utf8NoBom)
$finalDuration = Get-MediaDuration $outputVideo
if ($finalDuration -ge 180) {
  throw "Final video is not below the three-minute submission limit: $finalDuration seconds"
}

$probe = & ffprobe -v error -show_entries stream=index,codec_name,codec_type,width,height,sample_rate,channels -of json -- $outputVideo
if ($LASTEXITCODE -ne 0) {
  throw "Final ffprobe failed."
}

$manifest = [ordered]@{
  schemaVersion = 1
  generatedAt = [DateTime]::UtcNow.ToString("o")
  title = "Vertex Palace - Build Week Demo"
  voice = $Voice
  rate = $Rate
  resolution = "1920x1080"
  burnedInEnglishCaptions = $true
  separateEnglishCaptions = (Split-Path -Leaf $outputCaptions)
  durationSeconds = [Math]::Round($finalDuration, 3)
  underThreeMinutes = $finalDuration -lt 180
  segments = $segmentReports
  ffprobe = $probe | ConvertFrom-Json
}
[IO.File]::WriteAllText($outputManifest, "$(ConvertTo-Json $manifest -Depth 8)`n", $utf8NoBom)

Write-Host "Created: $outputVideo"
Write-Host "Captions: $outputCaptions"
Write-Host "Duration: $([Math]::Round($finalDuration, 3)) seconds"
