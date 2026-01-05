// DOM Elements
const searchForm = document.getElementById('searchForm');
const wordInput = document.getElementById('wordInput');
const searchBtn = document.getElementById('searchBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const wordDetails = document.getElementById('wordDetails');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const dismissError = document.getElementById('dismissError');
const themeToggle = document.getElementById('themeToggle');
const savedWordsContainer = document.getElementById('savedWords');
const emptySaved = document.getElementById('emptySaved');

// State
let savedWords = JSON.parse(localStorage.getItem('wordlySavedWords')) || [];
let currentTheme = localStorage.getItem('wordlyTheme') || 'light';

// API Base URL
const API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// Initialize the app
function initApp() {
    // Apply saved theme
    applyTheme(currentTheme);
    
    // Load saved words
    renderSavedWords();
    
    // Event Listeners
    searchForm.addEventListener('submit', handleSearch);
    dismissError.addEventListener('click', () => {
        errorMessage.style.display = 'none';
    });
    
    themeToggle.addEventListener('click', toggleTheme);
    
    // Add event delegation for saved words removal
    savedWordsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-saved')) {
            const wordToRemove = e.target.dataset.word;
            removeSavedWord(wordToRemove);
        }
    });
    
    // Add some example words to search bar on click
    document.querySelectorAll('.hint-examples span').forEach(span => {
        span.addEventListener('click', (e) => {
            wordInput.value = e.target.textContent;
            handleSearch(new Event('submit'));
        });
    });
    
    // Initialize with a sample word
    setTimeout(() => {
        wordInput.value = 'hello';
        handleSearch(new Event('submit'));
    }, 500);
}

// Handle search form submission
async function handleSearch(e) {
    e.preventDefault();
    
    const word = wordInput.value.trim();
    
    if (!word) {
        showError('Please enter a word to search.');
        return;
    }
    
    // Show loading state
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    searchBtn.disabled = true;
    
    try {
        const data = await fetchWordData(word);
        displayWordData(data);
        
        // Hide placeholder and error message
        resultsPlaceholder.style.display = 'none';
        errorMessage.style.display = 'none';
    } catch (error) {
        console.error('Error fetching word data:', error);
        showError(error.message || 'Failed to fetch word data. Please try again.');
        wordDetails.style.display = 'none';
        resultsPlaceholder.style.display = 'block';
    } finally {
        // Reset button state
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
        searchBtn.disabled = false;
    }
}

// Fetch word data from API
async function fetchWordData(word) {
    const response = await fetch(`${API_BASE_URL}/${word}`);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`No definitions found for "${word}". Please check the spelling and try again.`);
        } else {
            throw new Error(`API request failed with status ${response.status}`);
        }
    }
    
    return await response.json();
}

// Display word data in the UI
function displayWordData(data) {
    // Extract the first entry (most relevant)
    const wordData = data[0];
    const word = wordData.word;
    const phonetic = wordData.phonetic || wordData.phonetics?.find(p => p.text)?.text || 'Not available';
    const audioSrc = wordData.phonetics?.find(p => p.audio)?.audio;
    
    // Update word header
    document.getElementById('searchedWord').textContent = word;
    document.getElementById('wordPhonetic').textContent = phonetic;
    
    // Update part of speech (take the first one)
    const partOfSpeech = wordData.meanings[0]?.partOfSpeech || 'Not specified';
    document.getElementById('wordPartOfSpeech').textContent = partOfSpeech;
    
    // Setup audio playback if available
    const playAudioBtn = document.getElementById('playAudioBtn');
    const wordAudio = document.getElementById('wordAudio');
    
    if (audioSrc) {
        wordAudio.src = audioSrc;
        playAudioBtn.style.display = 'flex';
        playAudioBtn.onclick = () => {
            wordAudio.currentTime = 0;
            wordAudio.play().catch(e => console.log('Audio playback failed:', e));
        };
    } else {
        playAudioBtn.style.display = 'none';
    }
    
    // Update definitions
    const definitionsList = document.getElementById('definitionsList');
    definitionsList.innerHTML = '';
    
    wordData.meanings.forEach((meaning, meaningIndex) => {
        meaning.definitions.forEach((definition, defIndex) => {
            const definitionItem = document.createElement('div');
            definitionItem.className = 'definition-item';
            
            const defText = document.createElement('p');
            defText.className = 'definition-text';
            defText.textContent = `${meaningIndex + 1}.${defIndex + 1} ${definition.definition}`;
            
            definitionItem.appendChild(defText);
            
            if (definition.example) {
                const example = document.createElement('p');
                example.className = 'example';
                example.textContent = `Example: ${definition.example}`;
                definitionItem.appendChild(example);
            }
            
            definitionsList.appendChild(definitionItem);
        });
    });
    
    // Update synonyms
    const synonymsList = document.getElementById('synonymsList');
    synonymsList.innerHTML = '';
    
    // Collect all synonyms from all meanings
    const allSynonyms = [];
    wordData.meanings.forEach(meaning => {
        if (meaning.synonyms && meaning.synonyms.length > 0) {
            allSynonyms.push(...meaning.synonyms);
        }
    });
    
    // Limit to 10 unique synonyms
    const uniqueSynonyms = [...new Set(allSynonyms)].slice(0, 10);
    
    if (uniqueSynonyms.length > 0) {
        uniqueSynonyms.forEach(synonym => {
            const synonymTag = document.createElement('span');
            synonymTag.className = 'synonym-tag';
            synonymTag.textContent = synonym;
            synonymTag.addEventListener('click', () => {
                wordInput.value = synonym;
                handleSearch(new Event('submit'));
            });
            synonymsList.appendChild(synonymTag);
        });
    } else {
        synonymsList.innerHTML = '<p>No synonyms available for this word.</p>';
    }
    
    // Update source info
    const sourceInfo = document.getElementById('sourceInfo');
    sourceInfo.innerHTML = `
        <p><strong>Source:</strong> ${wordData.sourceUrls?.[0] || 'Not specified'}</p>
        <p><strong>License:</strong> ${wordData.license?.name || 'Not specified'}</p>
    `;
    
    // Update save button state
    const saveWordBtn = document.getElementById('saveWordBtn');
    const isSaved = savedWords.includes(word.toLowerCase());
    updateSaveButton(saveWordBtn, isSaved, word);
    
    saveWordBtn.onclick = () => {
        if (isSaved) {
            removeSavedWord(word);
            updateSaveButton(saveWordBtn, false, word);
        } else {
            addSavedWord(word);
            updateSaveButton(saveWordBtn, true, word);
        }
    };
    
    // Show word details
    wordDetails.style.display = 'block';
}

// Update save button appearance
function updateSaveButton(button, isSaved, word) {
    if (isSaved) {
        button.innerHTML = '<i class="fas fa-star"></i> Saved';
        button.classList.add('saved');
        button.setAttribute('aria-label', `Remove ${word} from saved words`);
    } else {
        button.innerHTML = '<i class="far fa-star"></i> Save';
        button.classList.remove('saved');
        button.setAttribute('aria-label', `Save ${word} to saved words`);
    }
}

// Add word to saved words
function addSavedWord(word) {
    const wordLower = word.toLowerCase();
    
    if (!savedWords.includes(wordLower)) {
        savedWords.push(wordLower);
        localStorage.setItem('wordlySavedWords', JSON.stringify(savedWords));
        renderSavedWords();
    }
}

// Remove word from saved words
function removeSavedWord(word) {
    const wordLower = word.toLowerCase();
    savedWords = savedWords.filter(w => w !== wordLower);
    localStorage.setItem('wordlySavedWords', JSON.stringify(savedWords));
    renderSavedWords();
    
    // Update save button if this word is currently displayed
    const currentWord = document.getElementById('searchedWord').textContent.toLowerCase();
    if (currentWord === wordLower) {
        const saveWordBtn = document.getElementById('saveWordBtn');
        updateSaveButton(saveWordBtn, false, word);
    }
}

// Render saved words list
function renderSavedWords() {
    savedWordsContainer.innerHTML = '';
    
    if (savedWords.length === 0) {
        emptySaved.style.display = 'block';
        return;
    }
    
    emptySaved.style.display = 'none';
    
    savedWords.forEach(word => {
        const wordCard = document.createElement('div');
        wordCard.className = 'saved-word-card';
        
        const wordSpan = document.createElement('span');
        wordSpan.className = 'saved-word';
        wordSpan.textContent = word;
        wordSpan.addEventListener('click', () => {
            wordInput.value = word;
            handleSearch(new Event('submit'));
        });
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-saved';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.setAttribute('aria-label', `Remove ${word} from saved words`);
        removeBtn.dataset.word = word;
        
        wordCard.appendChild(wordSpan);
        wordCard.appendChild(removeBtn);
        savedWordsContainer.appendChild(wordCard);
    });
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    wordDetails.style.display = 'none';
    resultsPlaceholder.style.display = 'none';
}

// Toggle theme
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('wordlyTheme', currentTheme);
    applyTheme(currentTheme);
}

// Apply theme to the page
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
