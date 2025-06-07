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

    // 创建进度条元素
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        left: 0;
        bottom: 0;
        height: 0.3vw;
        min-height: 3px;
        max-height: 6px;
        width: 0;
        background: linear-gradient(to right, rgba(0, 120, 255, 0.8), rgba(0, 180, 255, 0.8));
        z-index: 999999;
        pointer-events: none;
        transition: width 0.1s linear;
        display: none;
        box-shadow: 0 0 10px rgba(0, 120, 255, 0.3);
    `;

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
                fsElement.appendChild(progressBar);
                progressBar.style.display = 'block';
                updateProgress(video);
                // 解绑上一个 video 的事件
                if (lastVideo && lastVideo !== video) {
                    lastVideo.removeEventListener('timeupdate', updateHandler);
                }
                lastVideo = video;
                video.addEventListener('timeupdate', updateHandler);
            }
        } else {
            progressBar.style.display = 'none';
            if (lastVideo) {
                lastVideo.removeEventListener('timeupdate', updateHandler);
                lastVideo = null;
            }
        }
    }

    function updateHandler(e: Event) {
        updateProgress(e.target as HTMLVideoElement);
    }

    function updateProgress(video: HTMLVideoElement) {
        if (!video.duration) {
            progressBar.style.width = '0';
            return;
        }
        const progress = (video.currentTime / video.duration) * 100;
        progressBar.style.width = `${progress}%`;
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
})(); 