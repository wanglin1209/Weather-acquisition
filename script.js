const API_KEY = '7299795c1a8abb92a7286c649c3be624';
const API_URL = 'https://open.geovisearth.com/api/v1';

let citySearchTimeout;
let selectedCity = null;
let currentFocus = -1;

document.addEventListener('DOMContentLoaded', () => {
    const cityInput = document.getElementById('city-input');
    const cityList = document.getElementById('city-list');

    // 输入框事件监听
    cityInput.addEventListener('input', () => {
        clearTimeout(citySearchTimeout);
        citySearchTimeout = setTimeout(() => searchCities(cityInput.value), 300);
    });

    // 回车键触发搜索
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            getWeatherByInput();
        }
    });

    // 点击其他地方关闭城市列表
    document.addEventListener('click', (e) => {
        if (!cityInput.contains(e.target) && !cityList.contains(e.target)) {
            cityList.classList.remove('active');
        }
    });

    cityInput.addEventListener('keydown', (e) => {
        const cityList = document.getElementById('city-list');
        const items = cityList.getElementsByClassName('city-item');
        
        if (!items.length) return;

        // 向下箭头
        if (e.key === 'ArrowDown') {
            currentFocus++;
            addActive(items);
            e.preventDefault();
        }
        // 向上箭头
        else if (e.key === 'ArrowUp') {
            currentFocus--;
            addActive(items);
            e.preventDefault();
        }
        // 回车选择
        else if (e.key === 'Enter' && currentFocus > -1) {
            if (items[currentFocus]) {
                items[currentFocus].click();
                e.preventDefault();
            }
        }
    });
});

async function searchCities(query) {
    const cityList = document.getElementById('city-list');
    
    if (!query.trim()) {
        cityList.classList.remove('active');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/weather/city/lookup?key=${API_KEY}&location=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            displayCityList(data.data);
        } else {
            cityList.innerHTML = '<div class="city-item">未找到匹配的城市</div>';
            cityList.classList.add('active');
        }
    } catch (error) {
        console.error('搜索城市失败:', error);
    }
}

function displayCityList(cities) {
    const cityList = document.getElementById('city-list');
    cityList.innerHTML = '';
    currentFocus = -1;  // 重置选中项

    cities.slice(0, 10).forEach(city => {  // 限制显示前10个结果
        const cityItem = document.createElement('div');
        cityItem.className = 'city-item';
        
        // 添加更详细的地址信息
        const address = [city.name];
        if (city.adm2 && city.adm2 !== city.name) address.push(city.adm2);
        if (city.adm1 && city.adm1 !== city.adm2) address.push(city.adm1);
        
        cityItem.innerHTML = `
            <div class="city-name">${city.name}</div>
            <div class="city-info">${address.slice(1).join(' - ')}</div>
        `;
        
        cityItem.addEventListener('click', () => {
            selectedCity = city;
            document.getElementById('city-input').value = address.join(' - ');
            cityList.classList.remove('active');
            getWeather(city.id);
        });

        cityList.appendChild(cityItem);
    });

    cityList.classList.add('active');
}

async function getWeatherByInput() {
    const cityInput = document.getElementById('city-input');
    const city = cityInput.value.trim();

    if (!city) {
        alert('请输入城市名称');
        return;
    }

    if (selectedCity) {
        getWeather(selectedCity.id);
    } else {
        try {
            const response = await fetch(`${API_URL}/weather/city/lookup?key=${API_KEY}&location=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                getWeather(data.data[0].id);
            } else {
                alert('未找到该城市');
            }
        } catch (error) {
            console.error('搜索城市失败:', error);
            alert('搜索城市失败，请稍后重试');
        }
    }
}

async function getWeather(cityCode) {
    const loading = document.getElementById('loading');
    const weatherInfo = document.getElementById('weather-info');

    loading.style.display = 'flex';
    weatherInfo.style.display = 'none';
    selectedCity = null;

    try {
        // 获取实时天气
        const weatherResponse = await fetch(`${API_URL}/weather/now?key=${API_KEY}&location=${cityCode}`);
        const weatherData = await weatherResponse.json();

        if (!weatherData.data) {
            throw new Error('获取天气数据失败');
        }

        displayWeather(weatherData.data);

        // 获取天气预报
        const forecastResponse = await fetch(`${API_URL}/weather/forecast/3d?key=${API_KEY}&location=${cityCode}`);
        const forecastData = await forecastResponse.json();

        if (forecastData.data) {
            displayForecast(forecastData.data);
        }

    } catch (error) {
        console.error('获取天气信息失败:', error);
        alert(error.message || '获取天气信息失败，请稍后重试');
    } finally {
        loading.style.display = 'none';
        weatherInfo.style.display = 'block';
    }
}

function displayWeather(data) {
    const weatherInfo = document.getElementById('weather-info');
    const weather = data.now;

    weatherInfo.querySelector('.city').textContent = data.location.name;
    weatherInfo.querySelector('.update-time').textContent = `更新时间：${formatTime(weather.obsTime)}`;
    weatherInfo.querySelector('.temperature').textContent = `${Math.round(weather.temp)}°C`;
    weatherInfo.querySelector('.weather-text').textContent = weather.text;
    weatherInfo.querySelector('.wind').textContent = `风向：${weather.windDir} 风速：${weather.windSpeed}km/h`;
    weatherInfo.querySelector('.humidity').textContent = `相对湿度：${weather.humidity}%`;
}

function displayForecast(data) {
    const forecastContainer = document.getElementById('forecast');
    forecastContainer.innerHTML = '';

    data.daily.forEach(day => {
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-date">${formatDate(day.fxDate)}</div>
            <div class="forecast-temp">${Math.round(day.tempMin)}°C ~ ${Math.round(day.tempMax)}°C</div>
            <div class="forecast-text">${day.textDay}</div>
        `;
        forecastContainer.appendChild(forecastItem);
    });
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
    });
}

function addActive(items) {
    if (!items) return;
    removeActive(items);
    
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    
    items[currentFocus].classList.add('active-item');
    items[currentFocus].scrollIntoView({ block: 'nearest' });
}

function removeActive(items) {
    for (let item of items) {
        item.classList.remove('active-item');
    }
} 