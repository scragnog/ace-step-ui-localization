import re

# Read CreatePanel.tsx
with open('components/CreatePanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports = """
import { AudioSelectionSection } from './sections/AudioSelectionSection';
import { LyricsSection } from './sections/LyricsSection';
import { StyleSection } from './sections/StyleSection';
import { MusicParametersSection } from './sections/MusicParametersSection';
import { CoverRepaintSettings } from './sections/CoverRepaintSettings';
"""
content = re.sub(r'(import GenerationSettingsAccordion from \'./accordions/GenerationSettingsAccordion\';)', r'\1' + imports, content)


# 1. Replace Audio Selection Section (useReferenceAudio || taskType !== 'text2music')
audio_regex = re.compile(r'{\(useReferenceAudio \|\| taskType !== \'text2music\'\) && \([\s\S]*?{/\* TRACK DETAILS ACCORDION \(Custom mode only\) \*/}', re.DOTALL)

audio_replacement = """
            <AudioSelectionSection
              useReferenceAudio={useReferenceAudio}
              setUseReferenceAudio={setUseReferenceAudio}
              taskType={taskType}
              audioTab={audioTab}
              setAudioTab={setAudioTab}
              referenceAudioUrl={referenceAudioUrl}
              referenceAudioTitle={referenceAudioTitle}
              referencePlaying={referencePlaying}
              toggleAudio={toggleAudio}
              referenceDuration={referenceDuration}
              referenceTime={referenceTime}
              referenceAudioRef={referenceAudioRef}
              setReferenceAudioUrl={setReferenceAudioUrl}
              setReferenceAudioTitle={setReferenceAudioTitle}
              setReferencePlaying={setReferencePlaying}
              setReferenceTime={setReferenceTime}
              setReferenceDuration={setReferenceDuration}
              sourceAudioUrl={sourceAudioUrl}
              sourceAudioTitle={sourceAudioTitle}
              sourcePlaying={sourcePlaying}
              sourceDuration={sourceDuration}
              sourceTime={sourceTime}
              sourceAudioRef={sourceAudioRef}
              setSourceAudioUrl={setSourceAudioUrl}
              setSourceAudioTitle={setSourceAudioTitle}
              setSourcePlaying={setSourcePlaying}
              setSourceTime={setSourceTime}
              setSourceDuration={setSourceDuration}
              openAudioModal={openAudioModal}
              referenceInputRef={referenceInputRef}
              sourceInputRef={sourceInputRef}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              formatTime={formatTime}
              getAudioLabel={getAudioLabel}
            />
          </div>
        )}

        {/* TRACK DETAILS ACCORDION (Custom mode only) */}"""

content = audio_regex.sub(audio_replacement, content)


# 2. Replace Lyrics Sub-Accordion
lyrics_regex = re.compile(r'{/\* ── Lyrics Sub-Accordion ── \*/}[\s\S]*?{/\* ── Style Sub-Accordion ── \*/}', re.DOTALL)

lyrics_replacement = """{/* ── Lyrics Sub-Accordion ── */}
                <LyricsSection
                  showLyricsSub={showLyricsSub}
                  setShowLyricsSub={setShowLyricsSub}
                  instrumental={instrumental}
                  setInstrumental={setInstrumental}
                  lyrics={lyrics}
                  setLyrics={setLyrics}
                  lyricsRef={lyricsRef}
                  lyricsHeight={lyricsHeight}
                  startResizing={startResizing}
                  isFormattingLyrics={isFormattingLyrics}
                  handleFormat={handleFormat}
                />

                {/* ── Style Sub-Accordion ── */}"""

content = lyrics_regex.sub(lyrics_replacement, content)


# 3. Replace Style Sub-Accordion
style_regex = re.compile(r'<div>\s*<button\s*type="button"\s*onClick=\{\(\) => setShowStyleSub\(!showStyleSub\)\}[\s\S]*?{/\* ── Music Parameters ── \*/}', re.DOTALL)

style_replacement = """<StyleSection
                  showStyleSub={showStyleSub}
                  setShowStyleSub={setShowStyleSub}
                  style={style}
                  setStyle={setStyle}
                  refreshMusicTags={refreshMusicTags}
                  isFormattingStyle={isFormattingStyle}
                  handleFormat={handleFormat}
                  styleRef={styleRef}
                  styleHeight={styleHeight}
                  startResizingStyle={startResizingStyle}
                  genreDropdownRef={genreDropdownRef}
                  showGenreDropdown={showGenreDropdown}
                  setShowGenreDropdown={setShowGenreDropdown}
                  selectedMainGenre={selectedMainGenre}
                  setSelectedMainGenre={setSelectedMainGenre}
                  selectedSubGenre={selectedSubGenre}
                  setSelectedSubGenre={setSelectedSubGenre}
                  getSubGenreCount={getSubGenreCount}
                  genreSearch={genreSearch}
                  setGenreSearch={setGenreSearch}
                  filteredCombinedGenres={filteredCombinedGenres}
                  subGenreDropdownRef={subGenreDropdownRef}
                  showSubGenreDropdown={showSubGenreDropdown}
                  setShowSubGenreDropdown={setShowSubGenreDropdown}
                  filteredSubGenres={filteredSubGenres}
                  musicTags={musicTags}
                />

                {/* ── Music Parameters ── */}"""

content = style_regex.sub(style_replacement, content)


# 4. Replace Music Parameters
music_params_regex = re.compile(r'<div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-white/5">\s*<h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">\{t\(\'musicParameters\'\)\\}</h4>[\s\S]*?</div>\s*</div>\s*\)\}\s*</div>\s*\)\}\s*{/\* COMMON SETTINGS \(Simple mode only\) \*/}', re.DOTALL)

music_params_replacement = """<MusicParametersSection
                  bpm={bpm}
                  setBpm={setBpm}
                  keyScale={keyScale}
                  setKeyScale={setKeyScale}
                  timeSignature={timeSignature}
                  setTimeSignature={setTimeSignature}
                  duration={duration}
                  setDuration={setDuration}
                />
              </div>
            )}
          </div>
        )}

        {/* COMMON SETTINGS (Simple mode only) */}"""

content = music_params_regex.sub(music_params_replacement, content)


# 5. Replace Cover Repaint Settings
cover_regex = re.compile(r'{/\* COVER / REPAINT SETTINGS \(conditional on task type\) \*/}\s*\{taskType !== \'text2music\' && \([\s\S]*?{/\* GENERATION SETTINGS \*/}', re.DOTALL)

cover_replacement = """{/* COVER / REPAINT SETTINGS (conditional on task type) */}
        <CoverRepaintSettings
          taskType={taskType}
          audioCoverStrength={audioCoverStrength}
          setAudioCoverStrength={setAudioCoverStrength}
          repaintingStart={repaintingStart}
          setRepaintingStart={setRepaintingStart}
          repaintingEnd={repaintingEnd}
          setRepaintingEnd={setRepaintingEnd}
        />

        {/* GENERATION SETTINGS */}"""

content = cover_regex.sub(cover_replacement, content)

# Write back to file
with open('components/CreatePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched CreatePanel.tsx components successfully!')
