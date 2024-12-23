// 首页关键js，将被内联到html

// 定义区

//老旧浏览器检测
function browserTC() {
    btf.snackbarShow("");
    Snackbar.show({
        text: '为了保护访客访问安全，本站已停止对你正在使用的过低版本浏览器的支持',
        actionText: '关闭',
        duration: '6000',
        pos: 'bottom-right'
    });
}

function browserVersion() {
    var userAgent = navigator.userAgent;
    var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1;
    var isIE11 = userAgent.indexOf('Trident') > -1 && userAgent.indexOf("rv:11.0") > -1;
    var isEdge = userAgent.indexOf("Edge") > -1 && !isIE;
    var isFirefox = userAgent.indexOf("Firefox") > -1;
    var isOpera = userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1;
    var isChrome = userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Edge") == -1 && userAgent.indexOf("OPR") == -1;
    var isSafari = userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") == -1 && userAgent.indexOf("Edge") == -1 && userAgent.indexOf("OPR") == -1;
    if (isEdge) {
        if (userAgent.split('Edge/')[1].split('.')[0] < 90) {
            browserTC()
        }
    } else if (isFirefox) {
        if (userAgent.split('Firefox/')[1].split('.')[0] < 90) {
            browserTC()
        }
    } else if (isOpera) {
        if (userAgent.split('OPR/')[1].split('.')[0] < 80) {
            browserTC()
        }
    } else if (isChrome) {
        if (userAgent.split('Chrome/')[1].split('.')[0] < 90) {
            browserTC()
        }
    } else if (isSafari) {
        //不知道Safari多少版本才算老旧
    }
}

// Cookies
function setCookies(obj, limitTime) {
    let data = new Date(new Date().getTime() + limitTime * 24 * 60 * 60 * 1000).toUTCString()
    for (let i in obj) {
        document.cookie = i + '=' + obj[i] + ';expires=' + data
    }
}

function getCookie(name) {
    var arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg))
        return unescape(arr[2]);
    else
        return null;
}

// 翻页
function listenToPageInputPress() {
    var e = document.getElementById("toPageText")
        , t = document.getElementById("toPageButton");
    e && (e.addEventListener("keydown", (e => {
        13 === e.keyCode && (wjx.toPage(),
            pjax.loadUrl(t.href))
    }
    )),
        e.addEventListener("input", (function () {
            "" === e.value || "0" === e.value ? t.classList.remove("haveValue") : t.classList.add("haveValue");
            var o = document.querySelectorAll(".page-number")
                , n = +o[o.length - 1].innerHTML;
            +document.getElementById("toPageText").value > n && (e.value = n)
        }
        )))
}

// 页面百分比
function percent() {
    let e = document.documentElement.scrollTop || window.pageYOffset
        ,
        t = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight, document.body.clientHeight, document.documentElement.clientHeight) - document.documentElement.clientHeight
        , o = Math.round(e / t * 100)
        , n = document.querySelector("#percent");
    var a = window.scrollY + document.documentElement.clientHeight
        , i = document.getElementById("post-comment") || document.getElementById("footer");
    i.offsetTop + i.offsetHeight / 2 < a || o > 90 ? (document.querySelector("#nav-totop").classList.add("long"),
        n.innerHTML = "返回顶部") : (document.querySelector("#nav-totop").classList.remove("long"),
            o >= 0 && (n.innerHTML = o)),
        endresult = t - e,
        endresult < 100 ? $(".needEndHide").addClass("hide") : $(".needEndHide").removeClass("hide"),
        window.onscroll = percent
}

// 今日推荐展示更多
function bindTodayCardHoverEvent() {
    $(".topGroup").hover((function () { }
    ), (function () {
        hoverOnCommentBarrage = !1,
            document.getElementById("topGroup").classList.remove("hideCard"),
            document.getElementById("topGroup").style.zIndex = 1
    }
    ))
}

// 检查AVIF图片是否支持，并处理图片加载格式
// 如不支持，则换成webp格式
function checkAvif() {
    // 从页面中提取第一个AVIF图片链接
    function getFirstAvifUrl() {
        const images = document.querySelectorAll('img');
        for (let img of images) {
            if (img.src.endsWith('.avif')) {
                return img.src;
            }
        }
        return null;
    }

    // 检测浏览器是否支持AVIF格式
    function supportsAvif(url) {
        return new Promise(resolve => {
            const avif = new Image();
            avif.src = url;
            avif.onload = () => {
                resolve(true);
            };
            avif.onerror = () => {
                resolve(false);
            };
        });
    }

    // 替换图片URL中的avif为webp
    function replaceAvifWithWebp() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.src.endsWith('.avif')) {
                console.log("Replacing AVIF with WebP for image:", img.src);
                img.src = img.src.replace('.avif', '.webp');
            }
        });
    }

    const firstAvifUrl = getFirstAvifUrl(); // 获取第一个AVIF图片链接
    if (firstAvifUrl) {
        // 使用第一个AVIF图片链接进行检测
        supportsAvif(firstAvifUrl).then(supported => {
            if (!supported) {
                replaceAvifWithWebp();
            }
        });
    }
}


// 获取具有特定 class 的兄弟节点，返回第一个
function getSiblingNodesWithClass(element, className) {
    const parent = element.parentNode;

    // Iterate through the child nodes of the parent
    for (let i = 0; i < parent.children.length; i++) {
        const sibling = parent.children[i];
        // Check if the sibling has the specified class and is not the original element
        if (sibling !== element && sibling.classList.contains(className)) {
            return sibling;
        }
    }

    return null;
}

// 渐进加载图片
function progressiveLoad(element) {
    if (!element) return;
    // 隐藏缩略图
    var sibing = getSiblingNodesWithClass(element, 'progressive-thumbnail')
    if (sibing)
        sibing.classList.add('loaded');
    // 加载主图
    element.classList.add('loaded');
    // 去除模糊效果
    element.parentNode.classList.add('loaded');
}

// 运行区

// 浏览器版本检测
if (getCookie('browsertc') != 1) {
    setCookies({
        browsertc: 1,
    }, 1); //设置cookie缓存一天，即一天弹一次
    browserVersion();
}

// 加载动画
document.addEventListener('pjax:click', function () {
    //显示加载进度条
    if (GLOBAL_CONFIG.loadProgressBar) {
        Pace.restart();
    }
    //显示加载动画
    if (GLOBAL_CONFIG.loadingBox) {
        wjx.showLoading();
    }
})

//颜色
document.addEventListener('scroll', btf.throttle(function () {
    wjx.initThemeColor()
}, 200))

// 初始化博客
function initBlog() {
    // 图片主色
    wjx.addNavBackgroundInit(),
        wjx.darkModeStatus(),
        wjx.initThemeColor(),
        GLOBAL_CONFIG.rightMenuEnable && addRightMenuClickEvent(),
        percent(),
        listenToPageInputPress(),
        wjx.topPostScroll(),
        wjx.sayhi(),
        wjx.stopImgRightDrag(),
        //右下角 snackbar 弹窗
        GLOBAL_CONFIG.source.tool.switch && wjx.hidecookie(),
        wjx.onlyHome(),
        wjx.initIndexEssay(),
        wjx.reflashEssayWaterFall(),
        wjx.topCategoriesBarScroll(),
        //隐藏加载动画
        GLOBAL_CONFIG.loadingBox && wjx.hideLoading(),
        bindTodayCardHoverEvent()
    //halo.getTopSponsors()
}

$(document).ready((function () {
    initBlog()
})),

document.addEventListener("pjax:complete", (function () {
    initBlog();
    // 首次加载使用浏览器事件，之后pjax加载在此触发
    typeof initBlogLazy === 'function' && initBlogLazy();
    // 解决 katex pjax问题
    if ((GLOBAL_CONFIG.htmlType == 'post' || GLOBAL_CONFIG.htmlType == 'page') && typeof window.renderKaTex != 'undefined') {
        window.renderKaTex();
    }
}));

document.addEventListener('DOMContentLoaded', function () {
    const $blogName = document.getElementById('site-name')
    const $menusEle = document.querySelector('#menus .menus_items')
    const $searchEle = document.querySelector('#search-button')
    let blogNameWidth = $blogName && $blogName.offsetWidth
    let menusWidth = $menusEle && $menusEle.offsetWidth
    let searchWidth = $searchEle && $searchEle.offsetWidth

    // 初始化评论
    const $postComment = document.getElementById('post-comment')
    if ($postComment) {
        $('#to_comment').attr('style', 'display: block');
    } else {
        $('#to_comment').attr('style', 'display: none');
    }

    // 滚动条小于 0 的时候
    if (document.body.scrollHeight <= innerHeight) {
        $rightside.style.cssText = 'opacity: 1; transform: translateX(-58px)'
    }

    const adjustMenu = (change = false) => {
        if (change) {
            blogNameWidth = $blogName && $blogName.offsetWidth
            menusWidth = $menusEle && $menusEle.offsetWidth
            searchWidth = $searchEle && $searchEle.offsetWidth
        }
        const $nav = document.getElementById('nav')
        let t
        if (window.innerWidth < 768) t = true
        else t = blogNameWidth + menusWidth + searchWidth > $nav.offsetWidth - 120

        if (t) {
            $nav.classList.add('hide-menu')
        } else {
            $nav.classList.remove('hide-menu')
        }
    }

    // 初始化header
    const initAdjust = () => {
        adjustMenu()
        document.getElementById('nav').classList.add('show')
    }

    // sidebar menus
    const sidebarFn = () => {
        const $toggleMenu = document.getElementById('toggle-menu')
        const $mobileSidebarMenus = document.getElementById('sidebar-menus')
        const $menuMask = document.getElementById('menu-mask')
        const $body = document.body

        function openMobileSidebar() {
            btf.sidebarPaddingR()
            $body.style.overflow = 'hidden'
            btf.fadeIn($menuMask, 0.5)
            $mobileSidebarMenus.classList.add('open')
        }

        function closeMobileSidebar() {
            $body.style.overflow = ''
            $body.style.paddingRight = ''
            btf.fadeOut($menuMask, 0.5)
            $mobileSidebarMenus.classList.remove('open')
        }

        $toggleMenu.addEventListener('click', openMobileSidebar)

        $menuMask.addEventListener('click', e => {
            if ($mobileSidebarMenus.classList.contains('open')) {
                closeMobileSidebar()
            }
        })

        window.addEventListener('resize', e => {
            if (!btf.isHidden($toggleMenu)) {
                if ($mobileSidebarMenus.classList.contains('open')) closeMobileSidebar()
            }
        })
    }

    /**
     * 首頁top_img底下的箭頭
     */
    const scrollDownInIndex = () => {
        const $scrollDownEle = document.getElementById('scroll-down')
        const $homeTop = document.getElementById('home_top')
        $scrollDownEle && $scrollDownEle.addEventListener('click', function () {
            $homeTop && btf.scrollToDest($homeTop.offsetTop, 300)

        })
    }

    checkAvif()

    window.refreshFn = function () {
        initAdjust();
        sidebarFn()
        GLOBAL_CONFIG.isHome && scrollDownInIndex()
    }

    refreshFn()

    window.addEventListener('resize', adjustMenu)
    window.addEventListener('orientationchange', () => {
        setTimeout(adjustMenu(true), 100)
    })
})