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

    let lastVideo: HTMLVideoElement | null = null;

    // 创建缓存进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        height: 0.3vw;
        min-height: 3px;
        max-height: 6px;
        z-index: 999999;
        pointer-events: none;
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

    // 将进度条添加到容器中
    progressContainer.appendChild(bufferedBar);
    progressContainer.appendChild(progressBar);

    function handleFullscreenChange() {
        const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
        if (fsElement) {
            // 查找全屏元素下的 video
            let video: HTMLVideoElement | null = null;
            if (fsElement.tagName === 'VIDEO') {
                video = fsElement as HTMLVideoElement;
            } else {
                video = fsElement.querySelector('video');
            }
            if (video) {
                // 插入进度条到全屏元素
                fsElement.appendChild(progressContainer);
                progressContainer.style.display = 'block';
                updateProgress(video);
                updateBuffered(video);
                // 解绑上一个 video 的事件
                if (lastVideo && lastVideo !== video) {
                    lastVideo.removeEventListener('timeupdate', updateHandler);
                    lastVideo.removeEventListener('progress', bufferedHandler);
                }
                lastVideo = video;
                video.addEventListener('timeupdate', updateHandler);
                video.addEventListener('progress', bufferedHandler);
            }
        } else {
            progressContainer.style.display = 'none';
            if (lastVideo) {
                lastVideo.removeEventListener('timeupdate', updateHandler);
                lastVideo.removeEventListener('progress', bufferedHandler);
                lastVideo = null;
            }
        }
    }

    function updateHandler(e: Event) {
        updateProgress(e.target as HTMLVideoElement);
    }

    function bufferedHandler(e: Event) {
        updateBuffered(e.target as HTMLVideoElement);
    }

    function updateProgress(video: HTMLVideoElement) {
        if (!video.duration) {
            progressBar.style.width = '0';
            return;
        }
        const progress = (video.currentTime / video.duration) * 100;
        progressBar.style.width = `${progress}%`;
    }

    function updateBuffered(video: HTMLVideoElement) {
        if (!video.duration) {
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

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
})(); 