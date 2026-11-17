package com.clipaipro

import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PlayArrow
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

private val Background = Color(0xFF101018)
private val SurfaceDark = Color(0xFF1D1B2B)
private val Purple = Color(0xFF9B72FF)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ClipAiApp() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ClipAiApp() {
    val context = LocalContext.current
    val videos = remember { mutableStateListOf<Uri>() }
    var selectedIndex by remember { mutableIntStateOf(-1) }
    var ratio by remember { mutableStateOf("9:16") }
    var quality by remember { mutableStateOf("1080p") }

    val picker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenMultipleDocuments()
    ) { picked ->
        picked.forEach { uri ->
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }
            if (!videos.contains(uri)) videos.add(uri)
        }
        if (videos.isNotEmpty() && selectedIndex == -1) selectedIndex = 0
    }

    MaterialTheme(colorScheme = darkColorScheme(primary = Purple, background = Background, surface = SurfaceDark)) {
        Scaffold(containerColor = Background) { padding ->
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(top = 24.dp, bottom = 32.dp)
            ) {
                item {
                    Text("CLIP AI PRO", color = Purple, fontSize = 27.sp, fontWeight = FontWeight.Black)
                    Text("محرر الفيديوهات", color = Color.White, fontSize = 17.sp)
                }
                item {
                    Button(onClick = { picker.launch(arrayOf("video/*")) }, modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Purple)) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("اختيار فيديوهات من الهاتف")
                    }
                }
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp)) {
                            Text("معاينة الفيديو", color = Color.White, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(10.dp))
                            if (selectedIndex in videos.indices) {
                                VideoPreview(videos[selectedIndex])
                            } else {
                                Box(Modifier.fillMaxWidth().height(190.dp)
                                    .background(Color(0xFF09090E), RoundedCornerShape(12.dp)),
                                    contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.Movie, contentDescription = null, tint = Purple, modifier = Modifier.size(42.dp))
                                        Text("اختر فيديو لعرضه هنا", color = Color.LightGray)
                                    }
                                }
                            }
                        }
                    }
                }
                item { Text("مقاطعك (${videos.size})", color = Color.White, fontWeight = FontWeight.Bold) }
                itemsIndexed(videos) { index, uri ->
                    Card(colors = CardDefaults.cardColors(containerColor =
                        if (selectedIndex == index) Color(0xFF30264A) else SurfaceDark),
                        onClick = { selectedIndex = index }, modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Movie, contentDescription = null, tint = Purple)
                            Spacer(Modifier.width(10.dp))
                            Text("الفيديو ${index + 1}", color = Color.White, modifier = Modifier.weight(1f))
                            Text(if (selectedIndex == index) "محدد" else "اختيار", color = Purple)
                        }
                    }
                }
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = SurfaceDark)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("إعدادات التصدير", color = Color.White, fontWeight = FontWeight.Bold)
                            Text("نسبة الأبعاد", color = Color.LightGray)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("9:16", "16:9", "1:1").forEach { option ->
                                    FilterChip(selected = ratio == option, onClick = { ratio = option }, label = { Text(option) })
                                }
                            }
                            Text("الجودة", color = Color.LightGray)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("1080p", "720p", "480p").forEach { option ->
                                    FilterChip(selected = quality == option, onClick = { quality = option }, label = { Text(option) })
                                }
                            }
                            Button(onClick = {
                                Toast.makeText(context, "تم حفظ الإعدادات. ميزة القص والتصدير قيد التطوير.", Toast.LENGTH_LONG).show()
                            }, modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Purple)) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null)
                                Spacer(Modifier.width(6.dp))
                                Text("تجهيز الفيديو")
                            }
                            Text("هذه نسخة أولية: اختيار الفيديو ومعاينته وتحديد إعدادات الإخراج متاح. القص والدمج والتصدير الفعلي لم تُفعّل بعد.",
                                color = Color(0xFFB9B4C8), fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VideoPreview(uri: Uri) {
    val context = LocalContext.current
    val player = remember(uri) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(uri))
            prepare()
            playWhenReady = false
        }
    }
    DisposableEffect(player) { onDispose { player.release() } }
    AndroidView(factory = { ctx -> PlayerView(ctx).also { it.player = player } },
        update = { it.player = player }, modifier = Modifier.fillMaxWidth().height(210.dp))
}
