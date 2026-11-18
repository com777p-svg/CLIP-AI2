package com.clipaipro

import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ContentCut
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Redo
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import java.util.UUID

private val Ink = Color(0xFF0D0C13)
private val Panel = Color(0xFF1B1925)
private val PanelRaised = Color(0xFF262236)
private val Accent = Color(0xFF9D78FF)
private val Muted = Color(0xFFAAA5B8)

private data class TimelineClip(
    val id: String = UUID.randomUUID().toString(),
    val uri: Uri,
    val name: String,
    val sourceDurationMs: Long,
    val trimStartMs: Long = 0L,
    val trimEndMs: Long = sourceDurationMs
) {
    val durationMs: Long get() = (trimEndMs - trimStartMs).coerceAtLeast(0L)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ClipAiWorkspace() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ClipAiWorkspace() {
    val context = LocalContext.current
    val clips = remember { mutableStateListOf<TimelineClip>() }
    var selectedId by remember { mutableStateOf<String?>(null) }
    var playheadMs by remember { mutableLongStateOf(0L) }
    var isPlaying by remember { mutableStateOf(false) }
    var aspect by remember { mutableStateOf("9:16") }
    var exportQuality by remember { mutableStateOf("1080p") }
    val selected = clips.firstOrNull { it.id == selectedId }
    val totalDuration = clips.sumOf { it.durationMs }.coerceAtLeast(1L)

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        uris.forEachIndexed { index, uri ->
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }
            if (clips.none { it.uri == uri }) {
                val duration = runCatching {
                    MediaMetadataRetriever().use { retriever ->
                        retriever.setDataSource(context, uri)
                        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
                    }
                }.getOrNull()?.coerceAtLeast(1L) ?: 10_000L
                val clip = TimelineClip(
                    uri = uri,
                    name = "مقطع ${clips.size + index + 1}",
                    sourceDurationMs = duration
                )
                clips.add(clip)
                if (selectedId == null) selectedId = clip.id
            }
        }
    }

    MaterialTheme(colorScheme = darkColorScheme(
        primary = Accent, background = Ink, surface = Panel,
        onBackground = Color.White, onSurface = Color.White
    )) {
        Scaffold(
            containerColor = Ink,
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("CLIP AI PRO", fontWeight = FontWeight.Black, fontSize = 19.sp)
                            Text("مساحة التحرير", color = Muted, fontSize = 11.sp)
                        }
                    },
                    actions = {
                        IconButton(onClick = { playheadMs = 0L }) {
                            Icon(Icons.Default.Undo, contentDescription = "إعادة المؤشر للبداية", tint = Color.White)
                        }
                        IconButton(onClick = { if (clips.isNotEmpty()) playheadMs = totalDuration }) {
                            Icon(Icons.Default.Redo, contentDescription = "نهاية الخط الزمني", tint = Color.White)
                        }
                        TextButton(onClick = { }) { Text("تصدير", color = Muted) }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Ink, titleContentColor = Color.White)
                )
            }
        ) { padding ->
            Column(
                Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(horizontal = 14.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { picker.launch(arrayOf("video/*")) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Accent)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("إضافة فيديو")
                    }
                    OutlinedButton(onClick = { selected?.let { clips.remove(it); selectedId = clips.firstOrNull()?.id } },
                        enabled = selected != null) {
                        Icon(Icons.Default.Delete, contentDescription = null)
                        Text("حذف")
                    }
                }

                Card(
                    colors = CardDefaults.cardColors(containerColor = Panel),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically) {
                            Text("المعاينة", fontWeight = FontWeight.Bold)
                            Text(aspect, color = Accent, fontSize = 12.sp)
                        }
                        if (selected != null) {
                            VideoPreview(selected.uri, isPlaying) { isPlaying = it }
                        } else {
                            Box(Modifier.fillMaxWidth().height(190.dp).background(Ink, RoundedCornerShape(14.dp)),
                                contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.Movie, null, tint = Accent, modifier = Modifier.size(40.dp))
                                    Text("أضف فيديو لبدء مشروعك", color = Muted)
                                }
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = { isPlaying = !isPlaying }, enabled = selected != null) {
                                Icon(if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                    contentDescription = "تشغيل أو إيقاف", tint = Accent)
                            }
                            Text(if (isPlaying) "قيد التشغيل" else "متوقف", color = Muted, fontSize = 12.sp)
                            Spacer(Modifier.weight(1f))
                            Text("${formatTime(playheadMs)} / ${formatTime(totalDuration)}", color = Muted, fontSize = 12.sp)
                        }
                    }
                }

                Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(20.dp)) {
                    Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("الخط الزمني", fontWeight = FontWeight.Bold)
                            Text("${clips.size} مقاطع", color = Muted, fontSize = 12.sp)
                        }
                        Slider(
                            value = playheadMs.toFloat().coerceIn(0f, totalDuration.toFloat()),
                            onValueChange = { playheadMs = it.toLong() },
                            valueRange = 0f..totalDuration.toFloat(),
                            enabled = clips.isNotEmpty()
                        )
                        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            clips.forEach { clip ->
                                Card(
                                    onClick = { selectedId = clip.id },
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (clip.id == selectedId) Color(0xFF49356F) else PanelRaised
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(Modifier.width(112.dp).padding(10.dp)) {
                                        Icon(Icons.Default.Movie, null, tint = Accent)
                                        Text(clip.name, fontSize = 12.sp, maxLines = 1)
                                        Text(formatTime(clip.durationMs), color = Muted, fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = { splitSelected(clips, selected, playheadMs).also { selectedId = it } },
                                enabled = selected != null && playheadMs > 0L && playheadMs < totalDuration
                            ) {
                                Icon(Icons.Default.ContentCut, null)
                                Text("تقسيم")
                            }
                            Text("حدد مقطعًا ثم حرّر بدايته ونهايته", color = Muted, fontSize = 11.sp,
                                modifier = Modifier.align(Alignment.CenterVertically))
                        }
                    }
                }

                if (selected != null) {
                    Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(20.dp)) {
                        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("خصائص المقطع المحدد", fontWeight = FontWeight.Bold)
                            Text("بداية المقطع: ${formatTime(selected.trimStartMs)}", color = Muted, fontSize = 12.sp)
                            Slider(
                                value = selected.trimStartMs.toFloat(),
                                onValueChange = { value ->
                                    val start = value.toLong().coerceIn(0L, (selected.trimEndMs - 500L).coerceAtLeast(0L))
                                    updateClip(clips, selected.copy(trimStartMs = start))
                                },
                                valueRange = 0f..selected.sourceDurationMs.toFloat().coerceAtLeast(1f)
                            )
                            Text("نهاية المقطع: ${formatTime(selected.trimEndMs)}", color = Muted, fontSize = 12.sp)
                            Slider(
                                value = selected.trimEndMs.toFloat(),
                                onValueChange = { value ->
                                    val end = value.toLong().coerceIn((selected.trimStartMs + 500L).coerceAtMost(selected.sourceDurationMs), selected.sourceDurationMs)
                                    updateClip(clips, selected.copy(trimEndMs = end))
                                },
                                valueRange = 1f..selected.sourceDurationMs.toFloat().coerceAtLeast(1f)
                            )
                            Text("مدة الجزء المحدد: ${formatTime(selected.durationMs)}", color = Accent, fontSize = 12.sp)
                        }
                    }
                }

                Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(20.dp)) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("إعدادات المشروع", fontWeight = FontWeight.Bold)
                        Text("نسبة الأبعاد", color = Muted, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("9:16", "16:9", "1:1").forEach {
                                FilterChip(selected = aspect == it, onClick = { aspect = it }, label = { Text(it) })
                            }
                        }
                        Text("دقة الإخراج المطلوبة", color = Muted, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("1080p", "720p", "480p").forEach {
                                FilterChip(selected = exportQuality == it, onClick = { exportQuality = it }, label = { Text(it) })
                            }
                        }
                        Text("التصدير الفعلي سيُفعّل بعد ربط محرك الرندر. لا يتم إنشاء ملف فيديو في هذه المرحلة.",
                            color = Muted, fontSize = 11.sp)
                    }
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

private fun updateClip(clips: MutableList<TimelineClip>, replacement: TimelineClip) {
    val index = clips.indexOfFirst { it.id == replacement.id }
    if (index >= 0) clips[index] = replacement
}

private fun splitSelected(clips: MutableList<TimelineClip>, selected: TimelineClip?, playheadMs: Long): String? {
    if (selected == null) return selected?.id
    val startOnTimeline = clips.takeWhile { it.id != selected.id }.sumOf { it.durationMs }
    val localPosition = playheadMs - startOnTimeline
    val splitSource = selected.trimStartMs + localPosition
    if (localPosition <= 0L || localPosition >= selected.durationMs) return selected.id
    val first = selected.copy(trimEndMs = splitSource)
    val second = selected.copy(id = UUID.randomUUID().toString(), trimStartMs = splitSource, name = selected.name + " - 2")
    val index = clips.indexOfFirst { it.id == selected.id }
    clips[index] = first
    clips.add(index + 1, second)
    return second.id
}

private fun formatTime(ms: Long): String {
    val seconds = (ms.coerceAtLeast(0L) / 1000L)
    return "%02d:%02d".format(seconds / 60L, seconds % 60L)
}

@Composable
private fun VideoPreview(uri: Uri, playing: Boolean, onPlayingChange: (Boolean) -> Unit) {
    val context = LocalContext.current
    val player = remember(uri) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(uri))
            prepare()
            playWhenReady = false
        }
    }
    LaunchedEffect(playing, player) { player.playWhenReady = playing }
    DisposableEffect(player) { onDispose { player.release() } }
    AndroidView(
        factory = { ctx -> PlayerView(ctx).also { it.player = player; it.useController = true } },
        update = { it.player = player },
        modifier = Modifier.fillMaxWidth().height(210.dp)
    )
}
