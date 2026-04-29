// app.js

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
       1. DASTLABKI HOLAT VA O'ZGARUVCHILAR
       ========================================= */
    let balance = 100000.00; // Boshlang'ich kapital
    let currentPrice = 45000.00;
    let openPositions = []; // { id, type: 'long'|'short', amount, entryPrice }
    let priceHistory = [];  // { time, open, high, low, close }
    
    // Auth Modal Elementlar
    const elAppContainer = document.getElementById('app-container');
    const elAuthModal = document.getElementById('auth-modal');
    const authEmail = document.getElementById('auth-email');
    const authUsername = document.getElementById('auth-username');
    const btnRegister = document.getElementById('btn-register');
    const displayUsername = document.getElementById('display-username');

    // Tech Indicator Elementlar
    const elTechStatus = document.getElementById('tech-status');

    // Drawing Toolbar Elementlar
    const btnToolCursor = document.getElementById('tool-cursor');
    const btnToolDraw = document.getElementById('tool-draw');
    const btnToolClear = document.getElementById('tool-clear');

    // DOM Elementlar
    const elBalance = document.getElementById('user-balance');
    const elTotalPnl = document.getElementById('total-pnl');
    const elCurrentPrice = document.getElementById('current-price');
    const elPriceChange = document.getElementById('price-change');
    const elChartLoader = document.getElementById('chart-loader');
    
    const elPositionsBody = document.getElementById('positions-body');
    const elOrderAmount = document.getElementById('order-amount');
    const elOrderTotal = document.getElementById('order-total');
    
    const btnBuy = document.getElementById('btn-buy');
    const btnSell = document.getElementById('btn-sell');

    // Tutorial Elementlar
    const elTutContent = document.getElementById('tut-content');
    const elTutStepIndicator = document.getElementById('tut-step-indicator');
    const btnTutPrev = document.getElementById('btn-tut-prev');
    const btnTutNext = document.getElementById('btn-tut-next');

    // Chart Canvas Element
    const canvas = document.getElementById('trading-chart');
    const ctx = canvas.getContext('2d');

    let initialPrice = currentPrice;

    /* =========================================
       2. AUTHENTICATION VA LOCALSTORAGE ENGINE
       ========================================= */
       
    function checkAuth() {
        const savedUser = localStorage.getItem('ts_username');
        const savedBalance = localStorage.getItem('ts_balance');
        
        if (savedUser) {
            // Avval ro'yxatdan o'tgan
            displayUsername.innerText = savedUser;
            balance = savedBalance ? parseFloat(savedBalance) : 100000.00;
            updateBalanceDisplay();
            elAuthModal.style.display = 'none';
            elAppContainer.style.display = 'flex';
        } else {
            // Ro'yxatdan o'tmagan
            elAuthModal.style.display = 'flex';
            elAppContainer.style.display = 'none';
        }
    }

    btnRegister.addEventListener('click', () => {
        const email = authEmail.value.trim();
        const username = authUsername.value.trim();

        if (!email || !username) {
            alert("Iltimos, email va ismingizni kiriting!");
            return;
        }

        const usernameText = username.startsWith('@') ? username : '@' + username;
        
        localStorage.setItem('ts_username', usernameText);
        localStorage.setItem('ts_email', email);
        localStorage.setItem('ts_balance', balance);
        
        checkAuth();
    });

    // Avvalgi pozitsiyalar yo'q bo'lsa (simulyator boshlanganda), foydali bitim ochib ko'rsatish
    function initDummyProfitPosition() {
        if (openPositions.length === 0) {
            // Faraz qilaylik u ancha oldin sotib olgan (40000 narxidan, joriy narx 45000)
            const entryStr = 40000;
            if (currentPrice > entryStr && balance >= 100000) {
                const position = {
                    id: Date.now() - 100000,
                    type: 'long',
                    amount: 2.00, // 2 BTC
                    entryPrice: entryStr
                };
                openPositions.push(position);
                updatePositionsGrid();
            }
        }
    }

    /* =========================================
       3. PRICE ENGINE (Narx Simulyatori)
       ========================================= */
    
    // Boshlang'ich tarixni yaratish
    function generateInitialHistory() {
        let tempPrice = 40000;
        let now = Date.now() - 60000 * 50; // 50 minut oldin
        for(let i=0; i<50; i++) {
            let change = (Math.random() - 0.45) * 100; // Biroz o'sish tendensiyasi
            let open = tempPrice;
            let close = tempPrice + change;
            let high = Math.max(open, close) + Math.random() * 50;
            let low = Math.min(open, close) - Math.random() * 50;
            
            priceHistory.push({ time: now + i * 60000, open, high, low, close });
            tempPrice = close;
        }
        currentPrice = tempPrice;
        initialPrice = priceHistory[0].close;
        updatePriceDisplay(0);
    }

    // Har soniyada narxni yangilash
    function startPriceUpdate() {
        setInterval(() => {
            // Random Walk Algoritmi
            const volatility = 15; // Qanchalik tez o'zgarishi
            const change = (Math.random() - 0.5) * volatility;
            
            const oldPrice = currentPrice;
            currentPrice += change;
            
            // Xavfsizlik
            if (currentPrice < 100) currentPrice = 100;

            // Tarixdagi eng so'nggi shamchani yangilash
            const lastCandle = priceHistory[priceHistory.length - 1];
            lastCandle.close = currentPrice;
            if (currentPrice > lastCandle.high) lastCandle.high = currentPrice;
            if (currentPrice < lastCandle.low) lastCandle.low = currentPrice;

            // Yangi shamcha ochish (har 10 soniyada simulyatsiya uchun)
            if (Date.now() - lastCandle.time > 10000) {
                priceHistory.push({
                    time: Date.now(),
                    open: currentPrice,
                    high: currentPrice,
                    low: currentPrice,
                    close: currentPrice
                });
                if (priceHistory.length > 60) priceHistory.shift(); // Xotirani tozalash
            }

            // Texnik indikatorni yangilash
            updateTechIndicator(change);
            
            updatePriceDisplay(change);
            updatePositionsGrid();
            drawChart();
            
        }, 1000); // 1 soniya
    }

    function updateTechIndicator(change) {
        // Trendni o'rtacha hisoblash
        let sum = 0;
        const lookback = Math.min(priceHistory.length, 10);
        for(let i = priceHistory.length - lookback; i < priceHistory.length; i++) {
             sum += priceHistory[i].close - priceHistory[i].open;
        }
        
        if (sum > 50) {
            elTechStatus.innerText = "STRONG BUY";
            elTechStatus.className = "tech-status positive";
        } else if (sum < -50) {
            elTechStatus.innerText = "STRONG SELL";
            elTechStatus.className = "tech-status negative";
        } else {
            elTechStatus.innerText = "NEUTRAL";
            elTechStatus.className = "tech-status neutral";
        }
    }

    function updatePriceDisplay(change) {
        elCurrentPrice.innerText = currentPrice.toFixed(2);
        
        // Narx rangi
        if (change > 0) {
            elCurrentPrice.className = "current-price positive flash-up";
        } else if (change < 0) {
            elCurrentPrice.className = "current-price negative flash-down";
        }

        // 24h Change hisoblash
        const changePercent = ((currentPrice - initialPrice) / initialPrice) * 100;
        elPriceChange.innerText = (changePercent >= 0 ? "+" : "") + changePercent.toFixed(2) + "%";
        elPriceChange.className = changePercent >= 0 ? "h24-change positive" : "h24-change negative";

        // Order total yangilash
        const amt = parseFloat(elOrderAmount.value) || 0;
        elOrderTotal.value = (amt * currentPrice).toFixed(2);
    }

    /* =========================================
       4. CHART ENGINE (Grafik chizish & Asboblar)
       ========================================= */
       
    let currentTool = 'cursor'; // cursor | draw
    let isDrawingLine = false;
    let isPanning = false;

    // Viewport transform (Zoom & Pan)
    let panOffset = 0; // x-axis pan (pixels)
    let zoomLevel = 1.0; 

    // Drawings persist coordinates in [candleIndex, price] format
    let drawings = []; 
    let lineStart = null; 
    let currentMouseLineEnd = null;

    let dragStartX = 0;
    let initialPanOffset = 0;

    btnToolCursor.addEventListener('click', () => {
        currentTool = 'cursor';
        btnToolCursor.classList.add('active');
        btnToolDraw.classList.remove('active');
        canvas.style.cursor = 'default';
    });

    btnToolDraw.addEventListener('click', () => {
        currentTool = 'draw';
        btnToolDraw.classList.add('active');
        btnToolCursor.classList.remove('active');
        canvas.style.cursor = 'crosshair';
    });

    btnToolClear.addEventListener('click', () => {
        drawings = [];
        drawChart();
    });

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if(currentTool === 'draw') {
            isDrawingLine = true;
            // X va Y piksellarni vaqt/index va narxga o'tkazamiz
            lineStart = getPriceTimeFromPixels(x, y);
            currentMouseLineEnd = { ...lineStart };
        } else if (currentTool === 'cursor') {
            isPanning = true;
            dragStartX = x;
            initialPanOffset = panOffset;
            canvas.style.cursor = 'grab';
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isDrawingLine) {
            currentMouseLineEnd = getPriceTimeFromPixels(x, y);
            drawChart(); 
        } else if (isPanning) {
            const diffX = x - dragStartX;
            panOffset = initialPanOffset + diffX;
            // Limit pan
            if (panOffset > 0) panOffset = 0; 
            drawChart();
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (isDrawingLine) {
            isDrawingLine = false;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const lineEnd = getPriceTimeFromPixels(x, y);
            
            drawings.push({ start: lineStart, end: lineEnd });
            lineStart = null;
            currentMouseLineEnd = null;
            drawChart();
        }
        
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'default';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
         isPanning = false;
         isDrawingLine = false;
         lineStart = null;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomAmount = e.deltaY * -0.001;
        zoomLevel += zoomAmount;
        if (zoomLevel < 0.2) zoomLevel = 0.2;
        if (zoomLevel > 5) zoomLevel = 5;
        drawChart();
    });

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        drawChart();
    });

    // Grafik o'lchamlarini Global o'qish uchun variables
    let cachedPadX, cachedPadY, cachedHeight, cachedMinPrice, cachedPriceRange, cachedCandleWidth;

    function drawChart() {
        if(priceHistory.length === 0) return;
        if (elChartLoader) elChartLoader.style.display = 'none';

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        cachedPadX = 20;
        cachedPadY = 20;
        const width = canvas.width - cachedPadX * 2;
        cachedHeight = canvas.height - cachedPadY * 2;

        let minPrice = Math.min(...priceHistory.map(c => c.low));
        let maxPrice = Math.max(...priceHistory.map(c => c.high));
        // Kichik buffer qo'shish (padding vertical)
        minPrice -= (maxPrice - minPrice) * 0.05;
        maxPrice += (maxPrice - minPrice) * 0.05;
        
        cachedMinPrice = minPrice;
        cachedPriceRange = (maxPrice - minPrice) || 1;
        
        // Base candle width multiplied by zoom
        let baseCandleWidth = width / Math.max(priceHistory.length, 1);
        cachedCandleWidth = baseCandleWidth * zoomLevel;

        // Chizish
        priceHistory.forEach((candle, index) => {
            // Apply zoom scaling and panning to X
            const x = cachedPadX + panOffset + index * cachedCandleWidth;
            
            const openY = cachedPadY + cachedHeight - ((candle.open - minPrice) / cachedPriceRange) * cachedHeight;
            const closeY = cachedPadY + cachedHeight - ((candle.close - minPrice) / cachedPriceRange) * cachedHeight;
            const highY = cachedPadY + cachedHeight - ((candle.high - minPrice) / cachedPriceRange) * cachedHeight;
            const lowY = cachedPadY + cachedHeight - ((candle.low - minPrice) / cachedPriceRange) * cachedHeight;

            const isUp = candle.close >= candle.open;
            ctx.fillStyle = isUp ? "#0ecb81" : "#f6465d";
            ctx.strokeStyle = isUp ? "#0ecb81" : "#f6465d";
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(x + cachedCandleWidth / 2, highY);
            ctx.lineTo(x + cachedCandleWidth / 2, lowY);
            ctx.stroke();

            const bodyY = Math.min(openY, closeY);
            let bodyHeight = Math.abs(closeY - openY);
            if(bodyHeight < 1) bodyHeight = 1; 
            
            ctx.fillRect(x + cachedCandleWidth * 0.1, bodyY, cachedCandleWidth * 0.8, bodyHeight);
        });

        // Chizmalarni X/Y ga qaytarib moslab chizish
        ctx.strokeStyle = "#e0be2b";
        ctx.lineWidth = 2;
        
        drawings.forEach(d => {
            const p1 = getPixelsFromPriceTime(d.start);
            const p2 = getPixelsFromPriceTime(d.end);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });

        if(isDrawingLine && lineStart && currentMouseLineEnd) {
            const p1 = getPixelsFromPriceTime(lineStart);
            const p2 = getPixelsFromPriceTime(currentMouseLineEnd);
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Koordinata Mappers (Helper functions)
    function getPriceTimeFromPixels(pixelX, pixelY) {
        // Find index from pixelX using reverse formula
        const index = (pixelX - cachedPadX - panOffset) / cachedCandleWidth;
        const price = cachedMinPrice + ((cachedPadY + cachedHeight - pixelY) / cachedHeight) * cachedPriceRange;
        return { index, price };
    }

    function getPixelsFromPriceTime(pt) {
        const x = cachedPadX + panOffset + (pt.index * cachedCandleWidth) + (cachedCandleWidth / 2);
        const y = cachedPadY + cachedHeight - ((pt.price - cachedMinPrice) / cachedPriceRange) * cachedHeight;
        return { x, y };
    }

    /* =========================================
       5. TRADING ENGINE (Savdo mantiqi)
       ========================================= */

    function getFormattedMoney(val) {
        return "$" + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function updateBalanceDisplay() {
        elBalance.innerText = getFormattedMoney(balance);
        localStorage.setItem('ts_balance', balance); // Balansni xotiraga saqlash
    }

    function calculateTotalPnL() {
        let total = 0;
        openPositions.forEach(pos => {
            let diff = currentPrice - pos.entryPrice;
            if (pos.type === 'short') diff = -diff;
            total += diff * pos.amount;
        });
        return total;
    }

    function updatePositionsGrid() {
        elPositionsBody.innerHTML = '';
        
        const totalPnl = calculateTotalPnL();
        elTotalPnl.innerText = (totalPnl >= 0 ? "+" : "") + getFormattedMoney(totalPnl);
        elTotalPnl.className = "value " + (totalPnl > 0 ? "positive" : (totalPnl < 0 ? "negative" : "neutral"));

        if (openPositions.length === 0) {
            elPositionsBody.innerHTML = '<tr class="empty-row"><td colspan="7">Hozircha hech qanday pozitsiya yo\'q.</td></tr>';
            return;
        }

        openPositions.forEach((pos) => {
            let diff = currentPrice - pos.entryPrice;
            if (pos.type === 'short') diff = -diff;
            let pnl = diff * pos.amount;
            
            const tr = document.createElement('tr');
            
            const pnlClass = pnl >= 0 ? 'positive' : 'negative';
            const pnlText = (pnl >= 0 ? '+' : '') + pnl.toFixed(2);
            
            tr.innerHTML = `
                <td>BTC/USD</td>
                <td class="${pos.type === 'long' ? 'positive' : 'negative'}">${pos.type.toUpperCase()}</td>
                <td>${pos.amount.toFixed(2)}</td>
                <td>${pos.entryPrice.toFixed(2)}</td>
                <td>${currentPrice.toFixed(2)}</td>
                <td class="${pnlClass}">${pnlText}</td>
                <td>
                    <button class="btn-danger-outline" onclick="window.closePosition(${pos.id})">Yopish</button>
                </td>
            `;
            elPositionsBody.appendChild(tr);
        });
    }

    function openPosition(type) {
        const amount = parseFloat(elOrderAmount.value);
        if (isNaN(amount) || amount <= 0) return alert("Iltimos, miqdorni to'g'ri kiriting!");
        
        const cost = amount * currentPrice;
        
        // Faqat Long uchun oddiy balans tekshiruvi (simulyatorda cheklov bo'lmasin, margin trading hisobida)
        if (balance + calculateTotalPnL() - cost < -10000) {
             alert("Balans yetarli emas yoki hisob xavf ostida!");
             return;
        }

        const position = {
            id: Date.now(),
            type: type,
            amount: amount,
            entryPrice: currentPrice
        };
        
        openPositions.push(position);
        updatePositionsGrid();
    }

    // Global scope ga yopish funksiyasini qo'shish
    window.closePosition = function(id) {
        const posIndex = openPositions.findIndex(p => p.id === id);
        if (posIndex > -1) {
            const pos = openPositions[posIndex];
            let diff = currentPrice - pos.entryPrice;
            if (pos.type === 'short') diff = -diff;
            let pnl = diff * pos.amount;
            
            // Balansga pnl qo'shiladi (yoki olinadi)
            balance += pnl;
            
            openPositions.splice(posIndex, 1);
            updateBalanceDisplay();
            updatePositionsGrid();
        }
    }

    // Event Listeners
    btnBuy.addEventListener('click', () => openPosition('long'));
    btnSell.addEventListener('click', () => openPosition('short'));
    
    elOrderAmount.addEventListener('input', () => {
        const amt = parseFloat(elOrderAmount.value) || 0;
        elOrderTotal.value = (amt * currentPrice).toFixed(2);
    });

    /* =========================================
       6. TUTORIAL ENGINE (10 Qadamda Boyish Yo'li)
       ========================================= */
       
    const tutorials = [
        {
            title: "1-Qadam: $100,000 Kapital",
            text: "Tabriklaymiz! Sizda boshlang'ich kapital mavjud. Treydingning eng asosiy qoidasi: <b>Hech qachon bor pulingizni bitta joyga tikmang!</b> Boyish uchun risklarni boshqarish (Risk Management) kerak."
        },
        {
            title: "2-Qadam: Diversifikatsiya Nima?",
            text: "Pulingizni 100% bitta savdoga tikmang. Har bir savdoda (trade) kapitalingizning maksimal 1-5% qismini tavakkal qiling. Masalan, $100,000 dan $10,000 tikish, eng katta bozor qulashlarida ham sizni bankrotlikdan qutqaradi."
        },
        {
            title: "3-Qadam: Hissiyotlarni Boshqarish (FOMO & FUD)",
            text: "<b>FOMO (Fear of Missing Out):</b> Hamma olyapti deb narx tepada bo'lganda sotib olish. <br><b>FUD (Fear, Uncertainty, Doubt):</b> Vahimaga tushib narx tushganda arzon sotib yuborish. Boyish uchun robotdek hissiyotsiz bo'lish talab qilinadi."
        },
        {
            title: "4-Qadam: Trend Sizning Do'stingiz",
            text: "Bozor tepaga ketayotganda (Uptrend) asosan 'Long' pozitsiya oching. Bozor pastga qulayotganda (Downtrend) esa 'Short' orqali pastga o'ynab foyda qiling. Oqimga qarshi suzmang."
        },
        {
            title: "5-Qadam: Murakkab Foiz (Kompaunding)",
            text: "Agar siz $100,000 ni kuniga atigi 1% ga oshirsangiz va yutgan pulingizni yana qayta kiritsangiz (Murakkab foiz), juda tez orada kapitalingiz $500,000 ga yetadi. Sekin-asta o'sish - tez qimor o'ynashdan yaxshiroqdir."
        },
        {
            title: "6-Qadam: Asosiy Va Texnik Tahlil",
            text: "Treydingda faqat chiziqlarga rasm sifatida qaramang. O'sha aktiv ortidagi haqiqiy yangiliklarni (fundamental tahlil) va narxlar tarixidagi qonuniyatlarni (texnik tahlil) uyg'unlashtiring."
        },
        {
            title: "7-Qadam: Jurnal Yuriting",
            text: "Barcha foydali va zararli savdolaringizni yozib boring. Xatolaringizdan xulosa chiqarish sizni ertami kechmi albatta foydali strategiyaga olib chiqadi."
        },
        {
            title: "8-Qadam: Stop-Loss Ishlating! Fakt!",
            text: "90% yangi treyderlar pulini yo'qotadi (Fakt), chunki ular zararni ertaroq yopishni xohlashmaydi. Zararni darhol kesib tashlash, yo'qolgan foizlarni tezda tiklashga zamin yaratadi."
        },
        {
            title: "9-Qadam: Millionerlar Sabrli Bo'lishgan",
            text: "Uorren Baffet yoshligidan investitsiya qilgan va daromadining katta qismini 50 yoshidan keyin topgan. Doimiy aktiv qidiring. $500k ni $1M ga aylantirish xuddi shu strategiyani tartib-intizom bilan takomillashtirishdir."
        },
        {
            title: "10-Qadam: Amaliyot - Katta Savdo!",
            text: "Endi bor bilimlaringizni ishlating! Miqdor kiriting, narx kutib oling va Long yoki Short orqali foyda qilishni sinab ko'ring. O'z xotirangizdagi bu pulni $1,000,000 qilishga urining!"
        }
    ];

    let currentStep = 0;

    function renderTutorial() {
        const t = tutorials[currentStep];
        elTutContent.innerHTML = `<h4>${t.title}</h4><p>${t.text}</p>`;
        elTutStepIndicator.innerText = `${currentStep + 1} / ${tutorials.length}`;
        
        btnTutPrev.disabled = currentStep === 0;
        // btnTutNext.innerText = currentStep === tutorials.length - 1 ? "Tugatish" : "Keyingisi";
        if (currentStep === tutorials.length - 1) {
            btnTutNext.style.display = 'none';
        } else {
            btnTutNext.style.display = 'block';
        }
    }

    btnTutPrev.addEventListener('click', () => {
        if (currentStep > 0) currentStep--;
        renderTutorial();
    });

    btnTutNext.addEventListener('click', () => {
        if (currentStep < tutorials.length - 1) currentStep++;
        renderTutorial();
    });


    /* =========================================
       7. INTERAKTIV GUIDED TOUR (Dastlabki yordam yuritish)
       ========================================= */
       
    const tourOverlay = document.getElementById('tour-overlay');
    const tourHighlight = document.getElementById('tour-highlight');
    const tourPopup = document.getElementById('tour-popup');
    const btnTourSkip = document.getElementById('tour-skip');
    const btnTourNext = document.getElementById('tour-next');
    const tourTitle = document.getElementById('tour-title');
    const tourText = document.getElementById('tour-text');

    const tourSteps = [
        {
            title: "Grafik Paneli",
            text: "Chap tomonda siz narx o'zgarishini kuzatishingiz mumkin. 'Trend Chizig'i' vositasi yordamida o'zingiz ham grafik chizib tahlil qilishingiz mumkin.",
            targetId: "chart-container-div"
        },
        {
            title: "Texnik Indikator",
            text: "Bozor holati avtomatik tahlil qilinadi. Qachonki grafik pastda kuchayib borsa 'Buy', aksi bo'lganda 'Sell' ko'rsatkichi yonadi.",
            targetId: "tech-indicator"
        },
        {
            title: "Savdo va Pul ishlash",
            text: "O'ng tomonda Buy va Sell tugmalari orqali ishonchli bitim oching. Ushbu darsdan so'ng darhol $40k ga olingan Long foydasini o'zingiz yopasiz!",
            targetId: "btn-buy"
        }
    ];

    let currentTourStep = 0;

    function showTourStep() {
        if(currentTourStep >= tourSteps.length) {
            finishTour();
            return;
        }

        const step = tourSteps[currentTourStep];
        const target = document.getElementById(step.targetId);
        
        if(target) {
            const rect = target.getBoundingClientRect();
            tourHighlight.style.top = (rect.top - 5) + 'px';
            tourHighlight.style.left = (rect.left - 5) + 'px';
            tourHighlight.style.width = (rect.width + 10) + 'px';
            tourHighlight.style.height = (rect.height + 10) + 'px';

            // Popup joylashuvi
            if (rect.right + 320 < window.innerWidth) {
                tourPopup.style.left = (rect.right + 20) + 'px';
                tourPopup.style.top = rect.top + 'px';
            } else {
                tourPopup.style.left = (rect.left - 320) + 'px';
                tourPopup.style.top = rect.top + 'px';
            }
        }

        tourTitle.innerText = step.title;
        tourText.innerText = step.text;
    }

    function startTour() {
        const hasSeenTour = localStorage.getItem('ts_tour_seen');
        if (!hasSeenTour) {
            tourOverlay.style.display = 'block';
            showTourStep();
        }
    }

    function finishTour() {
        tourOverlay.style.display = 'none';
        localStorage.setItem('ts_tour_seen', 'true');
    }

    btnTourNext.addEventListener('click', () => {
        currentTourStep++;
        showTourStep();
    });

    btnTourSkip.addEventListener('click', finishTour);


    /* =========================================
       START APPLICATION
       ========================================= */
    checkAuth();
    generateInitialHistory();
    initDummyProfitPosition(); // Dastlabki yutuq
    resizeCanvas();
    startPriceUpdate();
    renderTutorial();
    
    // Auth oynasi yo'q bo'lsa darhol turni boshlash
    if (elAppContainer.style.display === 'flex') {
        setTimeout(() => { startTour(); }, 500);
    } else {
        btnRegister.addEventListener('click', () => { setTimeout(() => { startTour(); }, 500); });
    }

});
