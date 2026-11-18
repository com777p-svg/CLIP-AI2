package com.clipaipro.editor.core

/**
 * Non-destructive project model for CLIP AI.
 *
 * Timeline positions are stored in milliseconds. sourceUri is a persisted
 * content URI string; callers must verify that the app still has permission
 * before attempting to read the source.
 */
data class EditorProject(
    val id: String,
    val name: String,
    val canvas: CanvasSettings = CanvasSettings(),
    val tracks: List<EditorTrack> = emptyList(),
    val createdAtEpochMs: Long = System.currentTimeMillis(),
    val updatedAtEpochMs: Long = createdAtEpochMs,
    val schemaVersion: Int = CURRENT_SCHEMA_VERSION
) {
    companion object {
        const val CURRENT_SCHEMA_VERSION = 1
    }
}

data class CanvasSettings(
    val width: Int = 1080,
    val height: Int = 1920,
    val frameRate: Int = 30,
    val backgroundArgb: Long = 0xFF000000
)

enum class TrackKind {
    VIDEO,
    OVERLAY,
    TITLE,
    VOICE,
    MUSIC,
    SOUND_EFFECT
}

data class EditorTrack(
    val id: String,
    val name: String,
    val kind: TrackKind,
    val clips: List<EditorClip> = emptyList(),
    val isMuted: Boolean = false,
    val isLocked: Boolean = false
)

data class EditorClip(
    val id: String,
    val sourceUri: String,
    /** Position of this clip on the project timeline. */
    val timelineStartMs: Long,
    /** In-point in the original media. */
    val sourceStartMs: Long = 0L,
    /** Out-point in the original media. */
    val sourceEndMs: Long,
    val playbackSpeed: Float = 1f,
    val volume: Float = 1f,
    val transform: ClipTransform = ClipTransform(),
    val label: String = ""
) {
    val sourceDurationMs: Long
        get() = (sourceEndMs - sourceStartMs).coerceAtLeast(0L)

    val timelineDurationMs: Long
        get() = if (playbackSpeed > 0f) {
            (sourceDurationMs / playbackSpeed).toLong()
        } else {
            0L
        }

    val timelineEndMs: Long
        get() = timelineStartMs + timelineDurationMs
}

data class ClipTransform(
    val scale: Float = 1f,
    val rotationDegrees: Float = 0f,
    val positionX: Float = 0f,
    val positionY: Float = 0f,
    val cropLeft: Float = 0f,
    val cropTop: Float = 0f,
    val cropRight: Float = 1f,
    val cropBottom: Float = 1f
)

data class TimelineIssue(
    val code: String,
    val message: String,
    val trackId: String? = null,
    val clipId: String? = null
)

/**
 * Validates project data before preview/export. This deliberately reports
 * problems instead of silently modifying a user's edit decisions.
 */
object ProjectValidator {
    fun validate(project: EditorProject): List<TimelineIssue> {
        val issues = mutableListOf<TimelineIssue>()

        if (project.id.isBlank()) {
            issues += TimelineIssue("project.id.empty", "Project ID is missing.")
        }
        if (project.name.isBlank()) {
            issues += TimelineIssue("project.name.empty", "Project name is missing.")
        }
        if (project.canvas.width <= 0 || project.canvas.height <= 0) {
            issues += TimelineIssue("canvas.dimensions.invalid", "Canvas dimensions must be positive.")
        }
        if (project.canvas.frameRate !in 1..120) {
            issues += TimelineIssue("canvas.frame_rate.invalid", "Frame rate must be between 1 and 120.")
        }

        val trackIds = mutableSetOf<String>()
        project.tracks.forEach { track ->
            if (track.id.isBlank() || !trackIds.add(track.id)) {
                issues += TimelineIssue("track.id.invalid", "Track IDs must be non-empty and unique.", track.id)
            }

            val clipIds = mutableSetOf<String>()
            track.clips.forEach { clip ->
                if (clip.id.isBlank() || !clipIds.add(clip.id)) {
                    issues += TimelineIssue(
                        "clip.id.invalid",
                        "Clip IDs must be non-empty and unique within their track.",
                        track.id,
                        clip.id
                    )
                }
                if (clip.sourceUri.isBlank()) {
                    issues += TimelineIssue("clip.source.empty", "Clip source is missing.", track.id, clip.id)
                }
                if (clip.timelineStartMs < 0L || clip.sourceStartMs < 0L ||
                    clip.sourceEndMs <= clip.sourceStartMs
                ) {
                    issues += TimelineIssue("clip.range.invalid", "Clip time range is invalid.", track.id, clip.id)
                }
                if (clip.playbackSpeed <= 0f || !clip.playbackSpeed.isFinite()) {
                    issues += TimelineIssue("clip.speed.invalid", "Clip speed must be a positive finite value.", track.id, clip.id)
                }
                if (clip.volume !in 0f..1f) {
                    issues += TimelineIssue("clip.volume.invalid", "Clip volume must be between 0 and 1.", track.id, clip.id)
                }
            }
        }
        return issues
    }
}
