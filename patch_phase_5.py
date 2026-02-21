import sys
import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add imports
    imports = """import { CreatePanelHeader } from './sections/CreatePanelHeader';
import { TaskTypeSelector } from './sections/TaskTypeSelector';
import { SimpleModeSettings } from './sections/SimpleModeSettings';
import { TrackDetailsAccordion } from './accordions/TrackDetailsAccordion';
import { AudioLibraryModal } from './sections/AudioLibraryModal';
import { CreateButtonFooter } from './sections/CreateButtonFooter';
"""
    if "import { CreatePanelHeader }" not in content:
        content = content.replace("import { GenerationSettingsAccordion } from './accordions/GenerationSettingsAccordion';", 
                                  "import { GenerationSettingsAccordion } from './accordions/GenerationSettingsAccordion';\n" + imports)

    # 2. Re-Export KEY_SIGNATURES, TIME_SIGNATURES, VOCAL_LANGUAGE_KEYS if they're not fully exported
    # (Actually I already exported them in Phase 4)

    # 3. Patch Header Section
    header_start = "{/* Header - Mode Toggle & Model Selection */}"
    header_end = "{/* Model Mismatch Banner */}"
    # Wait, the end is actually right before TASK TYPE SELECTOR
    task_type_idx = content.find("{/* TASK TYPE SELECTOR */}")
    header_idx = content.find(header_start)
    if header_idx != -1 and task_type_idx != -1:
        # Extract the replacement block
        replacement = """{/* Header - Mode Toggle & Model Selection */}
        <CreatePanelHeader
          customMode={customMode}
          setCustomMode={setCustomMode}
          modelMenuRef={modelMenuRef}
          showModelMenu={showModelMenu}
          setShowModelMenu={setShowModelMenu}
          availableModels={availableModels}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          backendUnavailable={backendUnavailable}
          fetchedModels={fetchedModels}
          setInferenceSteps={setInferenceSteps}
          setUseAdg={setUseAdg}
          getModelDisplayName={getModelDisplayName}
          isTurboModel={isTurboModel}
          activeBackendModel={activeBackendModel}
          isSwitching={isSwitching}
          isGenerating={isGenerating}
          handleSwitchModel={handleSwitchModel}
        />

        """
        content = content[:header_idx] + replacement + content[task_type_idx:]

    # 4. Patch Task Type Selector
    task_start = "{/* TASK TYPE SELECTOR */}"
    simple_start = "{/* SIMPLE MODE */}"
    task_idx = content.find(task_start)
    simple_idx = content.find(simple_start)
    if task_idx != -1 and simple_idx != -1:
        replacement = """{/* TASK TYPE SELECTOR */}
        <TaskTypeSelector
          taskType={taskType}
          setTaskType={setTaskType}
          audioTab={audioTab}
          setAudioTab={setAudioTab}
          useReferenceAudio={useReferenceAudio}
        />

        """
        content = content[:task_idx] + replacement + content[simple_idx:]

    # 5. Patch Simple Mode Settings
    simple_idx = content.find(simple_start)
    custom_start = "{/* CUSTOM MODE */}"
    custom_idx = content.find(custom_start)
    if simple_idx != -1 and custom_idx != -1:
        replacement = """{/* SIMPLE MODE */}
        {!customMode && (
          <SimpleModeSettings
            songDescription={songDescription}
            setSongDescription={setSongDescription}
            vocalLanguage={vocalLanguage}
            setVocalLanguage={setVocalLanguage}
            vocalGender={vocalGender}
            setVocalGender={setVocalGender}
            duration={duration}
            setDuration={setDuration}
            bpm={bpm}
            setBpm={setBpm}
            keyScale={keyScale}
            setKeyScale={setKeyScale}
            timeSignature={timeSignature}
            setTimeSignature={setTimeSignature}
            batchSize={batchSize}
            setBatchSize={setBatchSize}
          />
        )}

        """
        content = content[:simple_idx] + replacement + content[custom_idx:]

    # 6. Patch Track Details Accordion wrapper
    track_start = "{/* TRACK DETAILS ACCORDION (Custom mode only) */}"
    common_start = "{/* COMMON SETTINGS (Simple mode only) */}"
    track_idx = content.find(track_start)
    common_idx = content.find(common_start)
    if track_idx != -1 and common_idx != -1:
        replacement = """{/* TRACK DETAILS ACCORDION (Custom mode only) */}
        {customMode && (
          <TrackDetailsAccordion
            showTrackDetails={showTrackDetails}
            setShowTrackDetails={setShowTrackDetails}
            instrumental={instrumental}
            setInstrumental={setInstrumental}
            vocalLanguage={vocalLanguage}
            setVocalLanguage={setVocalLanguage}
            vocalGender={vocalGender}
            setVocalGender={setVocalGender}
            title={title}
            setTitle={setTitle}
            showLyricsSub={showLyricsSub}
            setShowLyricsSub={setShowLyricsSub}
            lyrics={lyrics}
            setLyrics={setLyrics}
            lyricsRef={lyricsRef}
            lyricsHeight={lyricsHeight}
            startResizing={startResizing}
            isFormattingLyrics={isFormattingLyrics}
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
            bpm={bpm}
            setBpm={setBpm}
            keyScale={keyScale}
            setKeyScale={setKeyScale}
            timeSignature={timeSignature}
            setTimeSignature={setTimeSignature}
            duration={duration}
            setDuration={setDuration}
          />
        )}

        """
        content = content[:track_idx] + replacement + content[common_idx:]

    # 7. Patch Audio Library Modal
    # Looks for `showAudioModal && (` block up to Footer
    modal_regex = r'\{\s*showAudioModal\s*&&\s*\([\s\S]*?\}\s*\)\s*\}'
    # Need to be extremely careful. Let's find "{/* Footer Create Button */}"
    footer_idx = content.find("{/* Footer Create Button */}")
    
    # Let's find the start of the audio modal block which begins with "{  showAudioModal && (" or similar
    modal_block = re.search(r'\{\s*showAudioModal\s*&&\s*\([\s\S]*?(?=\{\/\* Footer Create Button \*\/})', content, re.MULTILINE)
    if modal_block:
        replacement = """<AudioLibraryModal
        showAudioModal={showAudioModal}
        setShowAudioModal={setShowAudioModal}
        audioModalTarget={audioModalTarget}
        setPlayingTrackId={setPlayingTrackId}
        setPlayingTrackSource={setPlayingTrackSource}
        uploadReferenceTrack={uploadReferenceTrack}
        isUploadingReference={isUploadingReference}
        isTranscribingReference={isTranscribingReference}
        uploadError={uploadError}
        cancelTranscription={cancelTranscription}
        libraryTab={libraryTab}
        setLibraryTab={setLibraryTab}
        isLoadingTracks={isLoadingTracks}
        referenceTracks={referenceTracks}
        setReferenceTracks={setReferenceTracks}
        toggleModalTrack={toggleModalTrack}
        playingTrackId={playingTrackId}
        playingTrackSource={playingTrackSource}
        modalTrackTime={modalTrackTime}
        setModalTrackTime={setModalTrackTime}
        modalTrackDuration={modalTrackDuration}
        setModalTrackDuration={setModalTrackDuration}
        modalAudioRef={modalAudioRef}
        formatTime={formatTime}
        useReferenceTrack={useReferenceTrack}
        deleteReferenceTrack={deleteReferenceTrack}
        createdTrackOptions={createdTrackOptions}
        token={token}
      />

      """
        content = content[:modal_block.start()] + replacement + content[footer_idx:]

    # 8. Patch Footer Create Button
    # Just grab from footer_idx to the end, but before the enclosing </div></div> )
    footer_idx = content.find("{/* Footer Create Button */}")
    if footer_idx != -1:
        # We need to replace up to the end of the return statement
        # The easiest way is to find the next </div> that closes the fragment.
        # CreateButtonFooter component is standalone. So just replace the div block.
        footer_block = re.search(r'\{\/\* Footer Create Button \*\/\}\s*<div[\s\S]*?<\/div>', content[footer_idx:])
        
        replacement = """{/* Footer Create Button */}
      <CreateButtonFooter
        handleGenerate={handleGenerate}
        isGenerating={isGenerating}
        isAuthenticated={isAuthenticated}
        activeJobCount={activeJobCount}
      />"""
        if footer_block:
            content = content[:footer_idx] + replacement + content[footer_idx + footer_block.end():]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    patch_file("D:/Ace-Step-Latest/ACE-Step-1.5-for-windows/ace-step-ui/components/CreatePanel.tsx")
