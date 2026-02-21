// ==UserScript==
// @name         Video Progress Bar
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Show a progress bar at the bottom of the screen when video is in fullscreen mode
// @author       haoxf
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let currentVideo: HTMLVideoElement | null = null;
    let progressInterval: number | null = null;
    let isDragging = false;
    let isHovering = false;

    // 创建缓存进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        height: 0.3vw;
        min-height: 3px;
        max-height: 3px;
        z-index: 999999;
        pointer-events: auto;
        cursor: pointer;
        background: rgba(0, 0, 0, 0.5);
    `;

    // 创建缓存进度条
    const bufferedBar = document.createElement('div');
    bufferedBar.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 0;
        background: rgba(125,125, 125, 0.8);
        transition: width 0.1s linear;
    `;

    // 创建播放进度条
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 0;
        background: linear-gradient(to right, rgba(0, 120, 255, 0.8), rgba(0, 180, 255, 0.8));
        transition: width 0.1s linear;
        box-shadow: 0 0 10px rgba(0, 120, 255, 0.3);
    `;

    // 创建进度条滑块
    const progressThumb = document.createElement('div');
    progressThumb.style.cssText = `
        position: absolute;
        right: -6px;
        top: 50%;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(0, 180, 255, 1);
        transform: translateY(-50%) scale(0);
        transition: transform 0.1s;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
        pointer-events: none;
        z-index: 1000000;
    `;
    progressBar.appendChild(progressThumb);

    // 将进度条添加到容器中
    progressContainer.appendChild(bufferedBar);
    progressContainer.appendChild(progressBar);

    function showThumb() {
        progressThumb.style.transform = 'translateY(-50%) scale(1)';
    }

    function hideThumb() {
        if (!isDragging) {
            progressThumb.style.transform = 'translateY(-50%) scale(0)';
        }
    }

    progressContainer.addEventListener('mouseenter', () => {
        isHovering = true;
        showThumb();
    });

    progressContainer.addEventListener('mouseleave', () => {
        isHovering = false;
        hideThumb();
    });

    // 进度条交互逻辑
    function handleProgressUpdate(e: MouseEvent) {
        if (!currentVideo || !currentVideo.duration) return;
        
        const rect = progressContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        
        currentVideo.currentTime = currentVideo.duration * percentage;
        progressBar.style.width = `${percentage * 100}%`;
    }

    progressContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        progressBar.style.transition = 'none'; // 拖拽时禁用过渡效果，防止延迟
        showThumb();
        handleProgressUpdate(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault(); // 防止拖拽时选中文本
            handleProgressUpdate(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        progressBar.style.transition = 'width 0.1s linear'; // 恢复过渡效果
        if (!isHovering) {
            hideThumb();
        }
    });

    // 重置进度条状态
    function resetProgress() {
        progressBar.style.width = '0';
        bufferedBar.style.width = '0';
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }

    // 查找视频元素的函数
    function findVideoElement(element: Element): HTMLVideoElement | null {
        // 如果当前元素是视频，直接返回
        if (element instanceof HTMLVideoElement) {
            return element;
        }

        // 在当前元素中查找视频
        const videos = element.querySelectorAll('video');
        if (videos.length === 0) {
            return null;
        }

        // 优先选择正在播放的视频
        for (const video of videos) {
            if (!video.paused && video.readyState >= 2) {
                return video;
            }
        }

        // 如果没有正在播放的视频，选择第一个可见的视频
        for (const video of videos) {
            if (video.offsetParent !== null) {
                return video;
            }
        }

        // 如果都没有，返回第一个视频
        return videos[0];
    }

    // 开始监听视频进度
    function startVideoProgress(video: HTMLVideoElement) {
        // 重置之前的状态
        resetProgress();
        
        // 更新当前视频
        currentVideo = video;

        // 立即更新一次进度
        updateProgress(video);
        updateBuffered(video);

        // 设置定时器更新进度
        progressInterval = window.setInterval(() => {
            if (video === currentVideo) {
                updateProgress(video);
                updateBuffered(video);
            }
        }, 100);

        // 添加视频事件监听
        video.addEventListener('play', () => updateProgress(video));
        video.addEventListener('pause', () => updateProgress(video));
        video.addEventListener('seeking', () => updateProgress(video));
        video.addEventListener('seeked', () => updateProgress(video));
    }

    // 停止监听视频进度
    function stopVideoProgress() {
        if (currentVideo) {
            currentVideo.removeEventListener('play', () => updateProgress(currentVideo!));
            currentVideo.removeEventListener('pause', () => updateProgress(currentVideo!));
            currentVideo.removeEventListener('seeking', () => updateProgress(currentVideo!));
            currentVideo.removeEventListener('seeked', () => updateProgress(currentVideo!));
        }
        resetProgress();
        currentVideo = null;
    }

    function handleFullscreenChange() {
        const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
        if (fsElement) {
            // 查找视频元素
            const video = findVideoElement(fsElement);
            
            if (video) {
                // 插入进度条到全屏元素
                fsElement.appendChild(progressContainer);
                progressContainer.style.display = 'block';

                // 开始监听新视频的进度
                startVideoProgress(video);
            }
        } else {
            progressContainer.style.display = 'none';
            stopVideoProgress();
        }
    }

    function updateProgress(video: HTMLVideoElement) {
        if (isDragging) return;
        if (!video.duration || isNaN(video.duration)) {
            progressBar.style.width = '0';
            return;
        }
        const progress = (video.currentTime / video.duration) * 100;
        progressBar.style.width = `${progress}%`;
    }

    function updateBuffered(video: HTMLVideoElement) {
        if (!video.duration || isNaN(video.duration) || video.readyState < 2) {
            bufferedBar.style.width = '0';
            return;
        }
        // 获取已缓冲的时间范围
        const buffered = video.buffered;
        if (buffered.length > 0) {
            // 使用最后一个缓冲范围
            const bufferedEnd = buffered.end(buffered.length - 1);
            const bufferedProgress = (bufferedEnd / video.duration) * 100;
            bufferedBar.style.width = `${bufferedProgress}%`;
        }
    }

    // 监听全屏变化
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // 定期检查视频是否发生变化
    setInterval(() => {
        const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
        if (fsElement) {
            const video = findVideoElement(fsElement);
            if (video && video !== currentVideo) {
                startVideoProgress(video);
            }
        }
    }, 500);
})(); 