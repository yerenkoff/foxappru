// procedures/dictionaries.js

export async function fetchDictionaryUrls(username) {
  try {
    const apiUrl = `https://api.github.com/repos/${username}/foxapp-data/contents`;
    const response = await fetch(apiUrl);
    if (!response.ok) return [];

    const files = await response.json();
    return files
      .filter((f) => f.name.endsWith(".txt"))
      .map((f) => ({
        name: f.name.replace(".txt", ""),
        url: f.download_url,
      }));
  } catch {
    return [];
  }
}

export async function fetchDictionary(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const text = await response.text();

    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(":").map((s) => s.trim());
        if (parts.length < 2) return null;
        return { word: parts[0], translation: parts[1] };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchDictionaryOffline(url) {
  if (!navigator.onLine) {
    const saved = localStorage.getItem("foxappDictionary");
    if (saved) return JSON.parse(saved).words;
    return [];
  }
  return fetchDictionary(url);
}

export async function renderDictionaries(
  username,
  dictList,
  startScreen,
  spawnWave,
  loop,
  state
) {
  dictList.innerHTML = "<p>Loading...</p>";
  const dictionaries = await fetchDictionaryUrls(username);

  if (!dictionaries.length) {
    dictList.innerHTML = "<p>No dictionaries found</p>";
    return;
  }

  dictList.innerHTML = "";
  dictionaries.forEach((dict) => {
    const button = document.createElement("button");
    button.textContent = dict.name;

    // auto-load specific dictionary
    if (
      dict.url === "https://raw.githubusercontent.com/foxappru/foxapp-data/main/english-french.txt"
    ) {
      fetchDictionaryOffline(dict.url).then((words) => {
        state.activeWords.length = 0;
        state.activeWords.push(...words);
        state.selectedDictionaryName = dict.name;

        startScreen.style.opacity = 0;
        startScreen.style.pointerEvents = "none";
        state.isStarted = true;

        spawnWave();

        if (!state.loopRunning) {
          state.loopRunning = true;
          loop();
        }
      });
    }

    // Uncomment to enable other dictionary buttons
    // button.addEventListener("click", async () => {
    //   state.activeWords.length = 0;
    //   state.activeWords.push(...await fetchDictionaryOffline(dict.url));
    //   state.selectedDictionaryName = dict.name;
    //
    //   startScreen.style.opacity = 0;
    //   startScreen.style.pointerEvents = "none";
    //   state.isStarted = true;
    //
    //   spawnWave();
    //   if (!state.loopRunning) {
    //     state.loopRunning = true;
    //     loop();
    //   }
    // });

    dictList.appendChild(button);
  });
}

