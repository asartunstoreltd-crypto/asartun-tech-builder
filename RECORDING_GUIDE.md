# Voice recording guide (ASARTUN TECH BUILDER)

1. Run the app and open it with `/#script` at the end of the address, for example
   http://localhost:5173/#script
   This shows every line to record, in Hausa and English, with its ID. "Copy as CSV" copies the list.
2. Choose clear, warm voices. Native speakers for each language. Read slowly, like talking to a child.
   If a child's voice is used, you need the parent's or guardian's written permission.
3. Record in a quiet room (a phone voice recorder is fine). One short file per line.
4. Save as .mp3 (or .m4a, .wav, .ogg). Name the file EXACTLY like the ID. Example: `cassava.teach.0.mp3`
5. Put Hausa files in `src/assets/audio/ha/` and English files in `src/assets/audio/en/`.
6. Refresh the page. Recorded lines show ✅ on the script page, and the 🔊 button turns on in the app.
   Lines with no file keep a disabled button. Nothing is faked.
7. If the Hausa text is corrected later, record that line again with the same file name.
