console.log('Lets write JavaScript');

let currentsong = new Audio();
let songs = [];
let currFolder;

// Function to convert seconds to MM:SS format
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

// Fetches songs from the specified folder (making the playlists)
async function getSongs(folder) {
    try {
        currFolder = folder;
        let a = await fetch(`/${folder}/`);
        if (!a.ok) throw new Error(`Failed to fetch songs from folder: ${folder}`);
        let response = await a.text();

        let div = document.createElement("div");
        div.innerHTML = response;
        let as = div.getElementsByTagName("a");
        songs = [];

        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            if (element.href.endsWith(".mpeg")) {
                const songName = element.href.split(`/${folder}/`)[1];
                if (songName) {
                    songs.push(songName);
                }
            }
        }

        let songUl = document.querySelector(".songlist ul");
        if (songUl) {
            songUl.innerHTML = ""; // Clear the existing playlist
            for (const song of songs) {
                songUl.innerHTML += `<li>
                                        <img class="invert" width="34" src="img/music.svg" alt="">
                                        <div class="info">
                                            <div>${song.replaceAll("%20", " ")}</div>
                                        </div>
                                        <div class="playnow">
                                            <img class="invert" src="img/play.svg" alt="">
                                        </div>
                                    </li>`;
            }

            // Attach click event listeners to each song in the playlist
            Array.from(document.querySelectorAll(".songlist li")).forEach(e => {
                e.addEventListener("click", () => {
                    const songName = e.querySelector(".info > div:first-child").innerText.trim();
                    playMusic(songName);
                });
            });
        } else {
            console.warn(".songlist ul not found in the DOM");
        }

    } catch (error) {
        console.error("Failed to load songs:", error);
    }
    return songs;
}

// Plays the specified track
const playMusic = (track, pause = false) => {
    currentsong.src = `/${currFolder}/` + track;
    if (!pause) {
        currentsong.play();
        document.querySelector("#play").src = "img/pause.svg";
    }
    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}

// Displays albums by fetching album info from the local server
async function displayAlbums() {
    try {
        let a = await fetch(`/songs/`);
        if (!a.ok) throw new Error("Failed to fetch albums");
        let response = await a.text();
        
        let div = document.createElement("div");
        div.innerHTML = response;
        let anchors = div.getElementsByTagName("a");
        let cardcontainer = document.querySelector(".cardcontainer");

        if (cardcontainer) {
            cardcontainer.innerHTML = ""; // Clear the card container
            let array = Array.from(anchors);
            for (let index = 0; index < array.length; index++) {
                const e = array[index];
                if (e.href.includes("/songs") && !e.href.includes(".htaccess")) {
                    let folder = e.href.split("/").slice(-2)[0];
                    let a = await fetch(`/songs/${folder}/info.json`);
                    if (!a.ok) throw new Error(`Failed to fetch album info for ${folder}`);
                    let response = await a.json();
                    cardcontainer.innerHTML += `<div data-folder="${folder}" class="card">
                                                    <div class="play">
                                                        <img src="img/play.svg" alt="">
                                                    </div>
                                                    <img src="/songs/${folder}/cover.jpg" alt="">
                                                    <h2>${response.title}</h2>
                                                    <p>${response.description}</p>
                                                </div>`;
                }
            }

            Array.from(document.getElementsByClassName("card")).forEach(e => {
                e.addEventListener("click", async item => {
                    console.log("Fetching Songs");
                    await getSongs(`songs/${item.currentTarget.dataset.folder}`);
                    playMusic(songs[0]);
                });
            });
        } else {
            console.warn(".cardcontainer not found in the DOM");
        }

    } catch (error) {
        console.error("Failed to display albums:", error);
    }
}

// Main function to initialize the music player
async function main() {
    await getSongs("songs/ncs");
    playMusic(songs[0], true);

    displayAlbums();

    // Fixing the selection of the song list items
    Array.from(document.querySelectorAll(".songlist li")).forEach(e => {
        e.addEventListener("click", () => {
            const songName = e.querySelector(".info > div:first-child").innerText.trim();
            playMusic(songName);
        });
    });

    document.querySelector("#play").addEventListener("click", () => {
        if (currentsong.paused) {
            currentsong.play();
            document.querySelector("#play").src = "img/pause.svg";
        } else {
            currentsong.pause();
            document.querySelector("#play").src = "img/play-btn.svg";
        }
    });

    currentsong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentsong.currentTime)} / ${secondsToMinutesSeconds(currentsong.duration)}`;
        const circle = document.querySelector(".circle");
        if (circle && currentsong.duration) {
            circle.style.left = (currentsong.currentTime / currentsong.duration) * 100 + "%";
        }
    });

    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentsong.currentTime = ((currentsong.duration) * percent) / 100;
    });

    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = 0;
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-110%";
    });

    document.querySelector("#prev").addEventListener("click", () => {
        let index = songs.indexOf(currentsong.src.split("/").slice(-1)[0]);
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1]);
        }
    });

    document.querySelector("#next").addEventListener("click", () => {
        let index = songs.indexOf(currentsong.src.split("/").slice(-1)[0]);
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    document.querySelector(".range input").addEventListener("input", (e) => {
        const volumeValue = e.target.value;
        currentsong.volume = parseInt(volumeValue) / 100;
        const volumeIcon = document.querySelector(".volume > img");
        if (currentsong.volume > 0) {
            volumeIcon.src = volumeIcon.src.replace("mute.svg", "volume.svg");
        } else {
            volumeIcon.src = volumeIcon.src.replace("volume.svg", "mute.svg");
        }
    });

    document.querySelector(".volume > img").addEventListener("click", (e) => {
        const volumeIcon = e.target;
        if (volumeIcon.src.includes("img/volume.svg")) {
            volumeIcon.src = volumeIcon.src.replace("img/volume.svg", "img/mute.svg");
            currentsong.volume = 0;
            document.querySelector(".range input").value = 0;
        } else {
            volumeIcon.src = volumeIcon.src.replace("img/mute.svg", "img/volume.svg");
            currentsong.volume = 0.10;
            document.querySelector(".range input").value = 10;
        }
    });

    currentsong.addEventListener('ended', () => {
        let index = songs.indexOf(currentsong.src.split("/").slice(-1)[0]);
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        }
    });
}

// Call the main function to start the application
main();
