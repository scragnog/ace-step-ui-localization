import sys

def run_patch():
    file_path = "D:/Ace-Step-Latest/ACE-Step-1.5-for-windows/ace-step-ui/components/CreatePanel.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        original = f.read()

    patched = original
    
    # 1. Imports
    if "import { CreatePanelHeader }" not in patched:
        imports = """import { CreatePanelHeader } from './sections/CreatePanelHeader';
import { TaskTypeSelector } from './sections/TaskTypeSelector';
import { SimpleModeSettings } from './sections/SimpleModeSettings';
import { TrackDetailsAccordion } from './accordions/TrackDetailsAccordion';
import { AudioLibraryModal } from './sections/AudioLibraryModal';
import { CreateButtonFooter } from './sections/CreateButtonFooter';
"""
        patched = patched.replace("import { GenerationSettingsAccordion } from './accordions/GenerationSettingsAccordion';", 
                                  "import { GenerationSettingsAccordion } from './accordions/GenerationSettingsAccordion';\n" + imports)

    # Function to replace text between tags
    def replace_between(start_tag, end_tag, replacement):
        nonlocal patched
        start_idx = patched.find(start_tag)
        end_idx = patched.find(end_tag)
        if start_idx != -1 and end_idx != -1:
            # We want to replace from start_tag (inclusive) to end_tag (exclusive)
            patched = patched[:start_idx] + replacement + patched[end_idx:]
            return True
        return False

    # 2. Header
    header_rep = """{/* Header - Mode Toggle & Model Selection */}
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
    replace_between("{/* Header - Mode Toggle & Model Selection */}", "{/* TASK TYPE SELECTOR */}", header_rep)

    # 3. Task Type
    task_rep = """{/* TASK TYPE SELECTOR */}
        <TaskTypeSelector
          taskType={taskType}
          setTaskType={setTaskType}
          audioTab={audioTab}
          setAudioTab={setAudioTab}
          useReferenceAudio={useReferenceAudio}
        />

        """
    replace_between("{/* TASK TYPE SELECTOR */}", "{/* SIMPLE MODE */}", task_rep)

    # 4. Simple Mode
    simple_rep = """{/* SIMPLE MODE */}
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
    replace_between("{/* SIMPLE MODE */}", "{/* CUSTOM MODE */}", simple_rep)

    # 5. Track Details
    track_rep = """{/* TRACK DETAILS ACCORDION (Custom mode only) */}
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
    replace_between("{/* TRACK DETAILS ACCORDION (Custom mode only) */}", "{/* COMMON SETTINGS (Simple mode only) */}", track_rep)

    # 6. Audio Modal
    # The audio modal starts with `{ showAudioModal && (` and ends right before `{/* Footer Create Button */}`
    modal_start_idx = patched.find("      {\n        showAudioModal && (")
    footer_idx = patched.find("{/* Footer Create Button */}")
    if modal_start_idx != -1 and footer_idx != -1:
        modal_rep = """<AudioLibraryModal
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
        patched = patched[:modal_start_idx] + modal_rep + patched[footer_idx:]
    else:
        # Fallback to alternative spacing
        modal_start_idx = patched.find("showAudioModal && (")
        # Go back to previous opening brace
        actual_start = patched.rfind("{", 0, modal_start_idx)
        if actual_start != -1 and footer_idx != -1:
            patched = patched[:actual_start] + modal_rep + patched[footer_idx:]


    # 7. Footer Create Button
    # Replace from `{/* Footer Create Button */}` to the next `</div>`
    footer_idx = patched.find("{/* Footer Create Button */}")
    if footer_idx != -1:
        # Find closing div of footer
        end_idx = patched.find("</div>\n    </div>\n  );\n}", footer_idx)
        if end_idx != -1:
            footer_rep = """{/* Footer Create Button */}
      <CreateButtonFooter
        handleGenerate={handleGenerate}
        isGenerating={isGenerating}
        isAuthenticated={isAuthenticated}
        activeJobCount={activeJobCount}
      />"""
            patched = patched[:footer_idx] + footer_rep + "\n  " + patched[end_idx:]


    with open(file_path, "w", encoding="utf-8") as f:
        f.write(patched)

run_patch()
