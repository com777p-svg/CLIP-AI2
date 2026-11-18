package com.clipaipro.editor.export

import android.content.Context
import android.net.Uri
import android.os.Environment
import androidx.media3.common.MediaItem
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import java.io.File

/**
 * Exports the ordered, trimmed video clips into one MP4 file.
 * Output is stored in the app's Movies folder; no source media is modified.
 */
class VideoExportEngine(
    context: Context,
    private val onCompleted: (File) -> Unit,
    private val onError: (Throwable) -> Unit
) {
    data class SourceClip(
        val uri: Uri,
        val startMs: Long,
        val endMs: Long
    )

    private val appContext = context.applicationContext
    private var transformer: Transformer? = null

    fun export(clips: List<SourceClip>): File {
        require(clips.isNotEmpty()) { "Add at least one video before exporting." }
        require(clips.all { it.startMs >= 0L && it.endMs > it.startMs }) {
            "One or more clips have an invalid trim range."
        }

        val outputDir = appContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES)
            ?: File(appContext.filesDir, "Movies")
        if (!outputDir.exists() && !outputDir.mkdirs()) {
            throw IllegalStateException("Could not create the export folder.")
        }
        val output = File(outputDir, "CLIP_AI_${System.currentTimeMillis()}.mp4")

        val editedItems = clips.map { clip ->
            val mediaItem = MediaItem.Builder()
                .setUri(clip.uri)
                .setClippingConfiguration(
                    MediaItem.ClippingConfiguration.Builder()
                        .setStartPositionMs(clip.startMs)
                        .setEndPositionMs(clip.endMs)
                        .build()
                )
                .build()
            EditedMediaItem.Builder(mediaItem).build()
        }
        val sequence = EditedMediaItemSequence.Builder(editedItems).build()
        val composition = Composition.Builder(sequence).build()

        transformer = Transformer.Builder(appContext)
            .addListener(object : Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                    transformer = null
                    onCompleted(output)
                }

                override fun onError(
                    composition: Composition,
                    exportResult: ExportResult,
                    exportException: ExportException
                ) {
                    transformer = null
                    output.delete()
                    onError(exportException)
                }
            })
            .build()
        transformer?.start(composition, output.absolutePath)
        return output
    }

    fun cancel() {
        transformer?.cancel()
        transformer = null
    }
}
