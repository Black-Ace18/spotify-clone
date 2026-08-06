console.log('Lets write JavaScript');
let currentSong = new Audio();
let songs = [];
let currFolder = "";

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    currFolder = folder;
    let response = await fetch(`/${folder}/`);
    let text = await response.text();
    let div = document.createElement("div");
    div.innerHTML = text;
    let anchors = div.getElementsByTagName("a");
    
    songs = [];

    for (let index = 0; index < anchors.length; index++) {
        const element = anchors[index];
        let href = element.getAttribute("href");

        if (href && (href.endsWith(".mp3") || href.endsWith(".MP3"))) {
            // Extract filename safely from relative/absolute URLs
            let fileName = href.split("/").pop();
            // Decode percent-encoded spaces and symbols (%20 -> " ")
            songs.push(decodeURIComponent(fileName));
        }
    }

    // Populate the UI playlist
    let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
    songUL.innerHTML = "";
    
    for (const song of songs) {
        songUL.innerHTML += `<li>
            <img class="invert" width="34" src="img/music.svg" alt="">
            <div class="info">
                <div>${song}</div>
                <div>Artist</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="img/play.svg" alt="">
            </div>
        </li>`;
    }

    // Bind event listeners using array indexes directly to avoid string parsing bugs
    Array.from(songUL.getElementsByTagName("li")).forEach((e, index) => {
        e.addEventListener("click", () => {
            playMusic(songs[index]);
        });
    });

    return songs;
}

const playMusic = (track, pause = false) => {
    if (!track) return;

    // Encode file components so special characters are handled by Audio()
    currentSong.src = `/${currFolder}/` + encodeURIComponent(track);

    if (!pause) {
        let playPromise = currentSong.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    let playBtn = document.getElementById("play") || document.querySelector("#play");
                    if (playBtn) playBtn.src = "img/pause.svg";
                })
                .catch((err) => {
                    console.log("Playback interrupted or forbidden:", err.message);
                });
        }
    }

    document.querySelector(".songinfo").innerHTML = track;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
};

async function displayAlbums() {
    console.log("displaying albums");
    let response = await fetch(`/songs/`);
    let text = await response.text();
    let div = document.createElement("div");
    div.innerHTML = text;
    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");
    
    let array = Array.from(anchors);

    for (let index = 0; index < array.length; index++) {
        const e = array[index];
        let href = e.getAttribute("href");

        if (href && href.includes("/songs/")) {
            let folder = href.split("/").filter(Boolean).pop();

            // Skip root directory or system files
            if (!folder || folder === "songs" || folder.includes(".htaccess")) continue;

            folder = decodeURIComponent(folder);
            console.log("Folder:", folder);

            try {
                let infoFetch = await fetch(`/songs/${folder}/info.json`);
                if (!infoFetch.ok) continue;

                let responseData = await infoFetch.json();

                cardContainer.innerHTML += `<div data-folder="${folder}" class="card">
                    <div class="play">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                                stroke-linejoin="round" />
                        </svg>
                    </div>
                    <img src="/songs/${folder}/cover.jpg" alt="">
                    <h2>${responseData.title}</h2>
                    <p>${responseData.description}</p>
                </div>`;
            } catch (err) {
                console.error("Error fetching album details:", err);
            }
        }
    }

    // Attach playlist loader to cards
    Array.from(document.getElementsByClassName("card")).forEach((e) => {
        e.addEventListener("click", async (item) => {
            let targetFolder = item.currentTarget.dataset.folder;
            console.log("Fetching Songs for folder:", targetFolder);
            songs = await getSongs(`songs/${targetFolder}`);
            if (songs.length > 0) {
                playMusic(songs[0]);
            }
        });
    });
}

async function main() {
    // 1. Get default songs list (using Atif Aslam folder from your server)
    await getSongs("songs/Atif Aslam");
    if (songs.length > 0) {
        playMusic(songs[0], true);
    }

    // 2. Display album cards dynamically
    await displayAlbums();

    // Play/Pause button event
    let playBtn = document.getElementById("play") || document.querySelector("#play");
    if (playBtn) {
        playBtn.addEventListener("click", () => {
            if (currentSong.paused) {
                currentSong.play();
                playBtn.src = "img/pause.svg";
            } else {
                currentSong.pause();
                playBtn.src = "img/play.svg";
            }
        });
    }

    // Seekbar update listener
    currentSong.addEventListener("timeupdate", () => {
        if (currentSong.duration && isFinite(currentSong.duration)) {
            document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
            document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
        }
    });

    // Seekbar click handler (safe from NaN errors)
    document.querySelector(".seekbar").addEventListener("click", (e) => {
        if (!currentSong.duration || !isFinite(currentSong.duration)) return;

        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    // Sidebar controls
    document.querySelector(".hamburger")?.addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close")?.addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Previous Button
    let previousBtn = document.getElementById("previous") || document.querySelector("#previous");
    if (previousBtn) {
        previousBtn.addEventListener("click", () => {
            currentSong.pause();
            let currentTrack = decodeURIComponent(currentSong.src.split("/").pop());
            let index = songs.indexOf(currentTrack);
            if (index - 1 >= 0) {
                playMusic(songs[index - 1]);
            }
        });
    }

    // Next Button
    let nextBtn = document.getElementById("next") || document.querySelector("#next");
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            currentSong.pause();
            let currentTrack = decodeURIComponent(currentSong.src.split("/").pop());
            let index = songs.indexOf(currentTrack);
            if (index + 1 < songs.length) {
                playMusic(songs[index + 1]);
            }
        });
    }

    // Volume controls
    let volumeInput = document.querySelector(".range")?.getElementsByTagName("input")[0];
    if (volumeInput) {
        volumeInput.addEventListener("change", (e) => {
            currentSong.volume = parseInt(e.target.value) / 100;
            let volImg = document.querySelector(".volume>img");
            if (volImg && currentSong.volume > 0) {
                volImg.src = volImg.src.replace("mute.svg", "volume.svg");
            }
        });
    }

    // Mute/Unmute toggle
    let volImg = document.querySelector(".volume>img");
    if (volImg && volumeInput) {
        volImg.addEventListener("click", (e) => {
            if (e.target.src.includes("volume.svg")) {
                e.target.src = e.target.src.replace("volume.svg", "mute.svg");
                currentSong.volume = 0;
                volumeInput.value = 0;
            } else {
                e.target.src = e.target.src.replace("mute.svg", "volume.svg");
                currentSong.volume = 0.1;
                volumeInput.value = 10;
            }
        });
    }
}

main();