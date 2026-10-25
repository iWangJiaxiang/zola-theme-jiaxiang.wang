// 博客全局js文件

// 定义区
(function() {
// 随机跳转
async function fetchRSSAndGetLink(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        const items = xmlDoc.getElementsByTagName("item");
        const links = Array.from(items).map(item => item.getElementsByTagName("link")[0].textContent);

        if (links.length > 0) {
            const randomLink = links[Math.floor(Math.random() * links.length)];
            console.log('randomLink:');
            console.log(randomLink);
            return randomLink;
        } else {
            console.error("No articles found.");
        }
    } catch (error) {
        console.error("Error fetching RSS feed:", error);
    }
}

function getPeriod(date) {
    var now = Date.now() / 1000;
    var publish_before = new Date(date).getTime() / 1000;
    var days = Math.floor((now - publish_before) / 86400);
    return days;
}

function setPostDateList() {
    const dateTag = document.getElementsByClassName("post-meta-date-publish");
    for (var i = 0; i < dateTag.length; i++) {
        var date = dateTag[i].getAttribute('datetime');
        var days = getPeriod(date);
        var publish_date = date;
        var date_str = "";
        if (days > 30) {
            date_str = publish_date;
        } else if (days > 0) {
            date_str = days + "天前";
        } else {
            date_str = "今天";
        }
        dateTag[i].innerHTML = date_str;
        dateTag[i].title = date + "创建";
    }
}

function setPostDate() {
    if (GLOBAL_CONFIG.passageTip.enable) {
        const messageBox = document.getElementById("passage-tip");
        if (messageBox && messageBox.getAttribute('data-tip-enable')) {
            const date = messageBox.getAttribute('data-update-date');
            const days = getPeriod(date);
            if (days > GLOBAL_CONFIG.passageTip.day) {
                messageBox.innerHTML = `<p>本文最后更新于 ${date}，文章内容可能已经过时。</p>`;
                messageBox.style.display = "block";
                setTimeout(function() {
                    messageBox.classList.add("fade-in");
                }, 10);
            }
        }
    }
}

window.toRandomPost = async function () {
    // 跳转全站的文章，可以从 sitemap 中获取所有文章
    const link = await fetchRSSAndGetLink('/rss.xml');

    // 当前窗口打开
    //window.location.href = post.permalink;
    pjax.loadUrl(link)
    // window.open(post.permalink);
}

// 复制按钮交互通知
function showcopy() {
    if (GLOBAL_CONFIG.Snackbar !== undefined) {
        btf.snackbarShow(GLOBAL_CONFIG.copy.success)
    } else {
        const prevEle = ctx.previousElementSibling
        prevEle.innerText = GLOBAL_CONFIG.copy.success
        prevEle.style.opacity = 1
        setTimeout(() => {
            prevEle.style.opacity = 0
        }, 700)
    }
}

window.onload = function () {
    var copybtnlist = document.getElementsByClassName("copybtn")
    for (var i = 0; i < copybtnlist.length; i++) {
        document.getElementsByClassName("copybtn")[i].addEventListener("click", function () {
            showcopy();
        });
    }
    wjx.initThemeColor();
}

// 友链随机传送
window.travelling = function (files, success) {
    // 动态读取缓存
    const data = JSON.parse(saveToLocal.get('links-data'))
    // 去重
    var map = new Map();
    data.forEach(item => {
        for (let link of item.links) {
            map.set(link["display_name"], link);
        }
    });
    var linksData = [...map.values()]
    var name = ''
    var link = ''
    if (linksData.length > 0) {
        var randomFriendLinks = getArrayItems(linksData, 1);
        name = randomFriendLinks[0].display_name;
        link = randomFriendLinks[0].url;
    }
    var msg = "点击前往按钮进入随机一个友链，不保证跳转网站的安全性和可用性。本次随机到的是本站友链：「" + name + "」";
    const style = document.createElement('style');
    document.head.appendChild(style);
    const styleSheet = style.sheet;
    styleSheet.insertRule(`:root{--wjx-snackbar-time: 8000ms!important}`, styleSheet.cssRules.length);
    Snackbar.show({
        text: msg,
        duration: 8000,
        pos: 'top-center',
        actionText: '前往',
        onActionClick: function (element) {
            $(element).css('opacity', 0);
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    });
}

//前往开往项目
window.totraveling = function (files, success) {
    btf.snackbarShow("即将跳转到「开往」项目的成员博客，不保证跳转网站的安全性和可用性", function (element) {
        element.style.opacity = 0,
            travellingsTimer && clearTimeout(travellingsTimer)
    }, 5000, "取消"),
        travellingsTimer = setTimeout(function () {
            window.open("https://www.travellings.cn/go.html", "_blank")
        }, "5000")
}

// 添加友链按钮
window.addFriendLink = function (files, success) {
    var input = document.getElementsByClassName(GLOBAL_CONFIG.source.comments.textarea)[0];
    let evt = document.createEvent('HTMLEvents');
    evt.initEvent('input', true, true);
    input.value = '昵称（请勿包含博客等字样）：\n网站地址（要求博客地址，请勿提交个人主页）：\n头像图片url（请提供尽可能清晰的图片，我会上传到我自己的图床）：\n描述：\n';
    input.dispatchEvent(evt);
    wjx.scrollTo("#post-comment");
    input.focus();
    input.setSelectionRange(-1, -1);
}

//封面纯色
function coverColor() {
    var path = document.getElementById("post-cover")?.src;
    // console.log(path);
    if (path !== undefined) {

        // 获取颜色 https://github.com/fast-average-color/fast-average-color
        const fac = new FastAverageColor();

        fac.getColorAsync(path, {
            // 忽略白色
            ignoredColor: [255, 255, 255, 255]
        })
            .then(color => {
                /**
                 * 获取数据后的处理程序
                 */
                var value = color.hex;
                // console.log(value);
                // document.getElementById('page-header').style.backgroundColor=value;
                // document.styleSheets[0].addRule('#page-header:before','background: '+ value +'!important');

                if (getContrastYIQ(value) === "light") {
                    value = LightenDarkenColor(colorHex(value), -40)
                }

                const style = document.createElement('style');
                document.head.appendChild(style);
                const styleSheet = style.sheet;
                styleSheet.insertRule(`:root{--wjx-main: ${value}!important}`, styleSheet.cssRules.length);
                styleSheet.insertRule(`:root{--wjx-main-op: ${value}23!important}`, styleSheet.cssRules.length);
                styleSheet.insertRule(`:root{--wjx-main-op-deep: ${value}dd!important}`, styleSheet.cssRules.length);
                styleSheet.insertRule(`:root{--wjx-main-none: ${value}00!important}`, styleSheet.cssRules.length);
                wjx.initThemeColor()
                document.getElementById("coverdiv").classList.add("loaded");
            })
            .catch(e => {
                console.log(e);
            });

    } else {
        // document.styleSheets[0].addRule('#page-header:before','background: none!important');
        const style = document.createElement('style');
        document.head.appendChild(style);
        const styleSheet = style.sheet;
        styleSheet.insertRule(`:root{--wjx-main: var(--wjx-theme)!important}`, styleSheet.cssRules.length);
        styleSheet.insertRule(`:root{--wjx-main-op: var(--wjx-theme-op)!important}`, styleSheet.cssRules.length);
        styleSheet.insertRule(`:root{--wjx-main-op-deep:var(--wjx-theme-op-deep)!important}`, styleSheet.cssRules.length);
        styleSheet.insertRule(`:root{--wjx-main-none: var(--wjx-theme-none)!important}`, styleSheet.cssRules.length);
        wjx.initThemeColor()
    }
}

// 标签侧边栏小组件
// 随机颜色生成器
function getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return { r, g, b };
}

function luminance(r, g, b) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(l1, l2) {
    return (l1 + 0.05) / (l2 + 0.05);
}

function generateTagsColor() {
    let color;
    let l1 = luminance(255, 255, 255); // Luminance of white

    for (const tag of document.getElementsByClassName('tag-item')) {
        do {
            color = getRandomColor();
            let l2 = luminance(color.r, color.g, color.b);
            var ratio = contrastRatio(l1, l2);
        } while (ratio < 4.5);
        const colorHex = `#${((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1)}`;
        tag.style.color = colorHex;
    }
}

//RGB颜色转化为16进制颜色
function colorHex(str) {
    var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
    var that = str;
    if (/^(rgb|RGB)/.test(that)) {
        var aColor = that.replace(/(?:\(|\)|rgb|RGB)*/g, "").split(",");
        var strHex = "#";
        for (var i = 0; i < aColor.length; i++) {
            var hex = Number(aColor[i]).toString(16);
            if (hex === "0") {
                hex += hex;
            }
            strHex += hex;
        }
        if (strHex.length !== 7) {
            strHex = that;
        }
        return strHex;
    } else if (reg.test(that)) {
        var aNum = that.replace(/#/, "").split("");
        if (aNum.length === 6) {
            return that;
        } else if (aNum.length === 3) {
            var numHex = "#";
            for (var i = 0; i < aNum.length; i += 1) {
                numHex += (aNum[i] + aNum[i]);
            }
            return numHex;
        }
    } else {
        return that;
    }
}

//16进制颜色转化为RGB颜色
function colorRgb(str) {
    var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
    var sColor = str.toLowerCase();
    if (sColor && reg.test(sColor)) {
        if (sColor.length === 4) {
            var sColorNew = "#";
            for (var i = 1; i < 4; i += 1) {
                sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
            }
            sColor = sColorNew;
        }
        //处理六位的颜色值
        var sColorChange = [];
        for (var i = 1; i < 7; i += 2) {
            sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
        }
        return "rgb(" + sColorChange.join(",") + ")";
    } else {
        return sColor;
    }
}

//评论增加放大功能
function owoBig() {
    new MutationObserver((e => {
        for (let t of e)
            if ("childList" === t.type)
                for (let e of t.addedNodes)
                    if (e.classList && e.classList.contains("OwO-body")) {
                        let t = e
                            , o = ""
                            , n = !0
                            , a = document.createElement("div");
                        a.id = "owo-big",
                            document.querySelector("body").appendChild(a),
                            t.addEventListener("contextmenu", (e => e.preventDefault())),
                            t.addEventListener("mouseover", (e => {
                                "LI" === e.target.tagName && n && (n = !1,
                                    o = setTimeout((() => {
                                        let t = 3 * e.target.clientWidth
                                            , o = e.x - e.offsetX - (t - e.target.clientWidth) / 2
                                            , n = e.y - e.offsetY;
                                        a.style.height = 3 * e.target.clientHeight + "px",
                                            a.style.width = t + "px",
                                            a.style.left = o + "px",
                                            a.style.top = n + "px",
                                            a.style.display = "flex",
                                            a.innerHTML = `<img src="${e.target.querySelector("img").src}" loading="lazy">`
                                    }
                                    ), 300))
                            }
                            )),
                            t.addEventListener("mouseout", (e => {
                                a.style.display = "none",
                                    n = !0,
                                    clearTimeout(o)
                            }
                            ))
                    }
    }
    )).observe(document.getElementById("post-comment"), {
        childList: !0,
        subtree: !0
    })
}

//变暗变亮主方法
function LightenDarkenColor(col, amt) {
    var usePound = false;

    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }

    var num = parseInt(col, 16);

    var r = (num >> 16) + amt;

    if (r > 255) r = 255;
    else if (r < 0) r = 0;

    var b = ((num >> 8) & 0x00FF) + amt;

    if (b > 255) b = 255;
    else if (b < 0) b = 0;

    var g = (num & 0x0000FF) + amt;

    if (g > 255) g = 255;
    else if (g < 0) g = 0;


    return (usePound ? "#" : "") + String("000000" + (g | (b << 8) | (r << 16)).toString(16)).slice(-6);
}

//判断是否为亮色
function getContrastYIQ(hexcolor) {
    var colorrgb = colorRgb(hexcolor);
    var colors = colorrgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    var red = colors[1];
    var green = colors[2];
    var blue = colors[3];
    var brightness;
    brightness = (red * 299) + (green * 587) + (blue * 114);
    brightness = brightness / 255000;
    if (brightness >= 0.5) {
        return "light";
    } else {
        return "dark";
    }
}

// 移除赞赏蒙版
function RemoveRewardMask() {
    if (!document.querySelector(".reward-main")) return;
    document.querySelector(".reward-main").style.display = "none";
    document.getElementById("quit-box").style.display = "none";
}

//添加赞赏蒙版
function AddRewardMask() {
    if (!document.querySelector(".reward-main")) return;
    document.querySelector(".reward-main").style.display = "flex";
    document.getElementById("quit-box").style.display = "flex";
}

// 评论弹幕初始化
function initObserver() {
    var e = document.getElementById("post-comment")
        , t = document.getElementById("pagination");
    e && new IntersectionObserver((function (e) {
        e.forEach((function (e) {
            e.isIntersecting ? (t && t.classList.add("show-window"),
                document.querySelector(".comment-barrage").style.bottom = "-200px") : (t && t.classList.remove("show-window"),
                    document.querySelector(".comment-barrage").style.bottom = "0px")
        }
        ))
    }
    )).observe(e)
}

//从一个给定的数组arr中,随机返回num个不重复项
window.getArrayItems = function(arr, num) {
    //新建一个数组,将传入的数组复制过来,用于运算,而不要直接操作传入的数组;
    var temp_array = new Array();
    for (var index in arr) {
        temp_array.push(arr[index]);
    }
    //取出的数值项,保存在此数组
    var return_array = new Array();
    for (var i = 0; i < num; i++) {
        //判断如果数组还有可以取出的元素,以防下标越界
        if (temp_array.length > 0) {
            //在数组中产生一个随机索引
            var arrIndex = Math.floor(Math.random() * temp_array.length);
            //将此随机索引的对应的数组元素值复制出来
            return_array[i] = temp_array[arrIndex];
            //然后删掉此索引的数组元素,这时候temp_array变为新的数组
            temp_array.splice(arrIndex, 1);
        } else {
            //数组中数据项取完后,退出循环,比如数组本来只有10项,但要求取出20项.
            break;
        }
    }
    return return_array;
}

// TOC
var tocFn = function () {
    const postContent = document.querySelector('.post-content');
    if (postContent == null) return;
    const titles = postContent.querySelectorAll('h1,h2,h3,h4,h5,h6');
    // 没有 toc 目录，则直接移除
    if (titles.length === 0 || !titles) {
        const cardToc = document.getElementById("card-toc");
        cardToc?.remove();
        const $mobileTocButton = document.getElementById("mobile-toc-button")
        if ($mobileTocButton) {
            $('#mobile-toc-button').attr('style', 'display: none');
        }
    } else {
        tocbot.init({
            tocSelector: '.toc-content',
            contentSelector: '.post-content',
            headingSelector: 'h1,h2,h3,h4,h5,h6',
            listItemClass: 'toc-item',
            activeLinkClass: 'active',
            activeListItemClass: 'active',
            headingsOffset: -400,
            scrollSmooth: true,
            scrollSmoothOffset: -70,
            tocScrollOffset: 50,
        });

        const $cardTocLayout = document.getElementById('card-toc')
        const $cardToc = $cardTocLayout.getElementsByClassName('toc-content')[0]

        // toc元素點擊
        $cardToc.addEventListener('click', (ele) => {
            if (window.innerWidth < 900) {
                $cardTocLayout.classList.remove("open");
            }
        })

    }
}

// 分类展开
var toggleCardCategory = function () {
    const $cardCategory = document.querySelectorAll('#aside-cat-list .card-category-list-item.parent i')
    if ($cardCategory.length) {
        $cardCategory.forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.preventDefault()
                const $this = this
                $this.classList.toggle('expand')
                const $parentEle = $this.parentNode.nextElementSibling
                if (btf.isHidden($parentEle)) {
                    $parentEle.style.display = 'block'
                } else {
                    $parentEle.style.display = 'none'
                }
            })
        })
    }
}

// 右下角悬浮操作按钮
var rightSideFn = {
    switchReadMode: () => { // read-mode
        const $body = document.body
        $body.classList.add('read-mode')
        const newEle = document.createElement('button')
        newEle.type = 'button'
        newEle.className = 'icon-sign-out-alt exit-readmode'
        $body.appendChild(newEle)
        function clickFn() {
            $body.classList.remove('read-mode')
            newEle.remove()
            newEle.removeEventListener('click', clickFn)
        }
        newEle.addEventListener('click', clickFn)
    },
    showOrHideBtn: () => { // rightside 點擊設置 按鈕 展開
        document.getElementById('rightside-config-hide').classList.toggle('show')
    },
    scrollToTop: () => { // Back to top
        btf.scrollToDest(0, 500)
    },
    hideAsideBtn: () => { // Hide aside
        const $htmlDom = document.documentElement.classList
        $htmlDom.contains('hide-aside')
            ? saveToLocal.set('aside-status', 'show', 2)
            : saveToLocal.set('aside-status', 'hide', 2)
        $htmlDom.toggle('hide-aside')
    },
    runMobileToc: item => {
        const tocEle = document.getElementById("card-toc");
        tocEle.style.transformOrigin = `right ${item.getBoundingClientRect().top + 17}px`;
        tocEle.style.transition = "transform 0.3s ease-in-out";
        tocEle.classList.toggle("open");
        tocEle.addEventListener(
            "transitionend",
            () => {
                tocEle.style.transition = "";
                tocEle.style.transformOrigin = "";
            },
            { once: true }
        );
    },
}

// justified-gallery 圖庫排版
// 需要 jQuery
var detectJgJsLoad = false
var runJustifiedGallery = function (ele) {

    if (detectJgJsLoad) btf.initJustifiedGallerys(ele)
    else {
        $('head').append(`<link rel="stylesheet" type="text/css" href="${GLOBAL_CONFIG.source.justifiedGallery.css}">`)
        $.getScript(`${GLOBAL_CONFIG.source.justifiedGallery.js}`, function () {

            btf.initJustifiedGallerys(ele)
        })
        detectJgJsLoad = true
    }
}

// fancybox
var addFancybox = function (ele) {
    const runFancybox = (ele) => {
        ele.each(function (i, o) {
            const $this = $(o)
            const lazyloadSrc = $this.attr('src')
            const dataCaption = $this.attr('alt') || ''
            $this.wrap(`<a href="${lazyloadSrc}" data-fancybox="images" data-caption="${dataCaption}" class="fancybox" data-srcset="${lazyloadSrc}"></a>`)

        })

        $().fancybox({
            selector: '[data-fancybox]',
            loop: true,
            transitionEffect: 'slide',
            protect: true,
            buttons: ['slideShow', 'fullScreen', 'thumbs', 'close'],
            hash: false
        })
    }

    if (typeof $.fancybox === 'undefined') {
        // $('head').append(`<link rel="stylesheet" type="text/css" href="${GLOBAL_CONFIG.source.fancybox.css}">`)
        $.getScript(`${GLOBAL_CONFIG.source.fancybox.js}`, function () {
            runFancybox($(ele))
        })
    } else {
        runFancybox($(ele))
    }
}

// 图片加载
var jqLoadAndRun = () => {
    const $fancyboxEle = GLOBAL_CONFIG.lightbox === 'fancybox'
        ? document.querySelectorAll('#article-container img:not(.no-lightbox), #article-container picture')
        : []
    const fbLengthNoZero = $fancyboxEle.length > 0
    const $jgEle = document.querySelectorAll('#article-container .gallery')
    const jgLengthNoZero = $jgEle.length > 0

    if (jgLengthNoZero || fbLengthNoZero) {
        btf.isJqueryLoad(() => {
            jgLengthNoZero && runJustifiedGallery($jgEle)
            fbLengthNoZero && addFancybox($fancyboxEle)
        })
    }
}

window.trackExternalLink = () => {
    if(!GLOBAL_CONFIG.umamiTrackExternalLink)
        return
    const name = 'outbound-link-click';
    document.querySelectorAll('a').forEach(a => {
      if (a.host !== window.location.host && !a.getAttribute('data-umami-event')) {
        a.setAttribute('data-umami-event', name);
        a.setAttribute('data-umami-event-url', a.href);
      }
    });
};

// 按需加载 js 或 css 文件，全部完成后调用 success 回调函数。 files: [{ path: '/js/file1.js', type: 'js' }, { path: '/css/file2.css', type: 'css' }]
window.loadFiles = function (files, success) {
    let loadedCount = 0;

    files.forEach(file => {
        let element;

        if (file.type === 'js') {
            element = document.createElement('script');
            element.src = file.path;
        } else if (file.type === 'css') {
            element = document.createElement('link');
            element.rel = 'stylesheet';
            element.href = file.path;
        }

        element.onload = () => {
            loadedCount++;
            // 所有文件加载完成后调用 success 函数
            if (loadedCount === files.length) {
                success(); 
            }
        };
        element.onerror = () => {
            // 加载失败仍然继续
            loadedCount++;
        };

        if (file.type === 'js') {
            document.body.appendChild(element);
        } else if (file.type === 'css') {
            document.head.appendChild(element);
        }
    });
}

// 側邊欄sub-menu 展開/收縮
// 解決menus在觸摸屏下，滑動屏幕menus_item_child不消失的問題（手機hover的bug)
var clickFnOfSubMenu = function () {
    document.querySelectorAll('#sidebar-menus .expand').forEach(function (e) {
        e.addEventListener('click', function () {
            this.classList.toggle('hide')
            const $dom = this.parentNode.nextElementSibling
            if (btf.isHidden($dom)) {
                $dom.style.display = 'block'
            } else {
                $dom.style.display = 'none'
            }
        })
    })

    window.addEventListener('touchmove', function (e) {
        const $menusChild = document.querySelectorAll('#nav .menus_item_child')
        $menusChild.forEach(item => {
            if (!btf.isHidden(item)) item.style.display = 'none'
        })
    })
}


// 表格溢出
var addTableWrap = function () {
    const $table = document.querySelectorAll('#article-container :not(.highlight) > table, #article-container > table')
    if ($table.length) {
        $table.forEach(item => {
            btf.wrap(item, 'div', '', 'table-wrap')
        })
    }
}

// 隐藏内容
var clickFnOfTagHide = function () {
    const $hideInline = document.querySelectorAll('#article-container .hide-button')
    if ($hideInline.length) {
        $hideInline.forEach(function (item) {
            item.addEventListener('click', function (e) {
                const $this = this
                const $hideContent = $this.nextElementSibling
                $this.classList.toggle('open')
                if ($this.classList.contains('open')) {
                    if ($hideContent.querySelectorAll('.gallery').length > 0) {
                        btf.initJustifiedGallerys($hideContent.querySelectorAll('.gallery'))
                    }
                }
            })
        })
    }
}

// 文章页标签切换
var tabsFn = {
    clickFnOfTabs: function () {
        document.querySelectorAll('#article-container .tab > button').forEach(function (item) {
            item.addEventListener('click', function (e) {
                const $this = this
                const $tabItem = $this.parentNode

                if (!$tabItem.classList.contains('active')) {
                    const $tabContent = $tabItem.parentNode.nextElementSibling
                    const $siblings = btf.siblings($tabItem, '.active')[0]
                    $siblings && $siblings.classList.remove('active')
                    $tabItem.classList.add('active')
                    const tabId = $this.getAttribute('data-href').replace('#', '')
                    const childList = [...$tabContent.children]
                    childList.forEach(item => {
                        if (item.id === tabId) item.classList.add('active')
                        else item.classList.remove('active')
                    })
                    const $isTabJustifiedGallery = $tabContent.querySelectorAll(`#${tabId} .gallery`)
                    if ($isTabJustifiedGallery.length > 0) {
                        btf.initJustifiedGallerys($isTabJustifiedGallery)
                    }
                }
            })
        })
    },
    backToTop: () => {
        document.querySelectorAll('#article-container .tabs .tab-to-top').forEach(function (item) {
            item.addEventListener('click', function () {
                btf.scrollToDest(btf.getEleTop(btf.getParents(this, '.tabs')), 300)
            })
        })
    }
}


// 运行区

// 如果当前页有评论就执行函数
document.getElementById("post-comment") && owoBig()

//检查是否开启快捷键
// if (localStorage.getItem('keyboardToggle') !== 'false') {
//     document.querySelector("#consoleKeyboard").classList.add("on");
// } else {
//     document.querySelector("#consoleKeyboard").classList.remove("on");
// }

//输入状态检测
$("input").focus(function () {
    wjx_intype = true;
});
$("textarea").focus(function () {
    wjx_intype = true;
});
$("input").focusout(function () {
    wjx_intype = false;
});
$("textarea").focusout(function () {
    wjx_intype = false;
});

//当前窗口得到焦点 
// window.onfocus = function () {
//     document.querySelector("#keyboard-tips").classList.remove("show");
// };

// $(window).on('keyup', function (ev) {
//     // 显示快捷键面板
//     if (ev.keyCode == 16) {
//         document.querySelector("#keyboard-tips").classList.remove("show");
//     }
// });


// 早上好问好
// 获取时间
window.getTimeState = function() {
    if (GLOBAL_CONFIG.profileStyle == 'default') {
        // 获取当前时间
        var timeNow = new Date();
        // 获取当前小时
        var hours = timeNow.getHours();
        // 设置默认文字
        var text = ``;
        // 判断当前时间段
        if (hours >= 0 && hours <= 5) {
            text = `晚安`;
        } else if (hours > 5 && hours <= 10) {
            text = `早上好`;
        } else if (hours > 10 && hours <= 14) {
            text = `中午好`;
        } else if (hours > 14 && hours <= 18) {
            text = `下午好`;
        } else if (hours > 18 && hours <= 24) {
            text = `晚上好`;
        }
        // 返回当前时间段对应的状态
        return text;
    }

    if (GLOBAL_CONFIG.profileStyle == 'one') {
        var e = (new Date).getHours()
            , t = "";
        return e >= 0 && e <= 5 ? t = "睡个好觉，保证精力充沛" : e > 5 && e <= 10 ? t = "一日之计在于晨" : e > 10 && e <= 14 ? t = "吃饱了才有力气干活" : e > 14 && e <= 18 ? t = "集中精力，攻克难关" : e > 18 && e <= 24 && (t = "不要太劳累了，早睡更健康"),
            t
    }
},
    //深色模式切换
    switchDarkMode = () => {
        "dark" === document.documentElement.getAttribute("data-theme") ? (activateLightMode(),
            saveToLocal.set("theme", "light", 2),
            void 0 !== GLOBAL_CONFIG.Snackbar && btf.snackbarShow(GLOBAL_CONFIG.Snackbar.night_to_day, false, 2000),
            $(".menu-darkmode-text").text("深色模式")) : (activateDarkMode(),
                saveToLocal.set("theme", "dark", 2),
                void 0 !== GLOBAL_CONFIG.Snackbar && btf.snackbarShow(GLOBAL_CONFIG.Snackbar.day_to_night, false, 2000),
                $(".menu-darkmode-text").text("浅色模式")),
            handleCases()
        wjx.darkModeStatus();
    }
    , handleCases = () => {
        "function" == typeof utterancesTheme && utterancesTheme(),
            "object" == typeof FB && window.loadFBComment(),
            window.DISQUS && document.getElementById("disqus_thread").children.length && setTimeout((() => window.disqusReset()), 200)
    }
    , navFn = {
        switchDarkMode: switchDarkMode
    };

// 快捷键
$(window).on('keydown', function (ev) {

    // 响应esc键
    if (ev.keyCode == 27) {
        wjx.hideLoading();
        wjx.hideConsole();
        rm.hideRightMenu();
    }

    if (wjx_keyboard && ev.shiftKey && !wjx_intype) {

        // 显示快捷键面板 shift键
        // if (ev.keyCode == 16) {
        //     document.querySelector("#keyboard-tips").classList.add("show");
        // }

        //关闭快捷键 shift+K
        if (ev.keyCode == 75) {
            wjx.keyboardToggle();
            return false;
        }

        //响应打开控制台键 shift+A
        if (ev.keyCode == 65) {
            wjx.showConsole();
            return false;
        }

        //音乐控制 shift+M
        if (ev.keyCode == 77) {
            wjx.musicToggle();
            return false;
        }

        //随机文章 shift+R
        if (ev.keyCode == 82) {
            toRandomPost();
            return false;
        }

        //回到首页 shift+H
        if (ev.keyCode == 72) {
            pjax.loadUrl("/");
            return false;
        }

        //深色模式 shift+D
        if (ev.keyCode == 68) {
            rm.switchDarkMode();
            return false;
        }

        //友情链接页面 shift+L
        if (ev.keyCode == 76) {
            pjax.loadUrl("/link/");
            return false;
        }

        //关于本站 shift+P
        if (ev.keyCode == 80) {
            pjax.loadUrl("/about/");
            return false;
        }

        //在线工具 shift+T
        if (ev.keyCode == 84) {
            pjax.loadUrl("/tlink/");
            return false;
        }
    }
});

//自动调整即刻短文尺寸
window.addEventListener("resize", (function () {
    document.querySelector("#waterfall") && wjx.reflashEssayWaterFall()
}
));

// 阻止滚动
// document.querySelector('#site-search').addEventListener('wheel', (e) => {
//   e.preventDefault()
// })
document.querySelector('#console') && document.querySelector('#console').addEventListener('wheel', (e) => {
    e.preventDefault()
})
// document.querySelector('#loading-box').addEventListener('wheel', (e) => {
//   e.preventDefault()
// })

// 检测按键：开发者模式
window.onkeydown = function (e) {
    if (e.keyCode === 123) {
        btf.snackbarShow('开发者模式已打开，请遵循GPL协议', false, 3000)
    }
}

//监听ctrl+C
$(document).unbind('keydown').bind('keydown', function (e) {
    if (GLOBAL_CONFIG.rightMenuEnable) {
        if ((e.ctrlKey || e.metaKey) && (e.keyCode == 67) && (selectTextNow != '')) {
            btf.snackbarShow('复制成功，复制和转载请标注本文地址');
            rm.rightmenuCopyText(selectTextNow);
            return false;
        }
    }
})

// 评论
initObserver()

// 文章页背景
GLOBAL_CONFIG.source.post.dynamicBackground && coverColor()
// 充电
wjx.addPowerLinksInPostRightSide()

// 监听赞赏蒙版关闭
document.addEventListener('touchstart', e => {
    RemoveRewardMask()
}, false)

// 标签侧边栏小组件随机颜色
if (typeof isTagsRandomColor !== "undefined" && isTagsRandomColor) {
    generateTagsColor();
}

//页脚友链
GLOBAL_CONFIG.isFriendLinksInFooter && wjx.addFriendLinksInFooter()

window.trackExternalLink()

//音乐页面切换歌曲调用
if (GLOBAL_CONFIG.isMusic) {
    wjx.changeMusicBg(false);
}

window.initBlogLazy = runOnce('initBlogLazy')(() => {
    if (GLOBAL_CONFIG.isPost) {
        tocFn();
        // 二维码
        runPostAbstract()
        setPostDate()
        wjx.qrcodeCreate()
    } else {
        toggleCardCategory()
        setPostDateList()
    }

    document.getElementById('rightside').addEventListener('click', function (e) {
        const $target = e.target.id || e.target.parentNode.id
        switch ($target) {
            case 'go-up':
                rightSideFn.scrollToTop()
                break
            case 'rightside-config':
                rightSideFn.showOrHideBtn()
                break
            case "mobile-toc-button":
                rightSideFn.runMobileToc(this);
                break;
            case 'readmode':
                rightSideFn.switchReadMode()
                break
            case 'darkmode':
                navFn.switchDarkMode();
                break
            case 'hide-aside-btn':
                rightSideFn.hideAsideBtn()
                break
            default:
                break
        }
    })

    addTableWrap()
    clickFnOfTagHide()
    tabsFn.clickFnOfTabs()
    tabsFn.backToTop()
    jqLoadAndRun()

    clickFnOfSubMenu()
})

document.addEventListener('DOMContentLoaded', function () {
    initBlogLazy()
});

})();