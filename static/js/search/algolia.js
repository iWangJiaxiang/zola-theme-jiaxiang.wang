window.addEventListener("load", () => {
    const $searchMask = document.getElementById("search-mask");
    const $searchDialog = document.querySelector("#site-search .search-dialog");

    const openSearch = () => {
      btf.animateIn($searchMask, "to_show 0.5s");
      $searchDialog.style.display = "block";
      setTimeout(() => {
        document.querySelector("#site-search .ais-SearchBox-input").focus();
      }, 100);
  
      // shortcut: ESC
      document.addEventListener("keydown", function f(event) {
        if (event.code === "Escape") {
          closeSearch();
          document.removeEventListener("keydown", f);
        }
      });
  
      fixSafariHeight();
      window.addEventListener("resize", fixSafariHeight);

      if (!searchLibLoaded) {
        searchLibLoaded = true;
        const searchInput = document.getElementsByClassName("ais-SearchBox-input")[0];
        searchInput.disabled = true;
        loadFiles(searchFiles, () => {
          initSearch();
          searchInput.disabled = false;
        });
      }

    };

    // shortcut: shift+S
    if (GLOBAL_CONFIG.keyboard) {
      window.addEventListener("keydown", function (event) {
        if (event.keyCode == 83 && event.shiftKey) {
          console.info(selectTextNow);
          if (selectTextNow) {
            openSearch();
            const t = document.querySelector("#site-search-input > div > form > input");
            t.value = selectTextNow;
            t.dispatchEvent(new Event("input"));
            setTimeout(() => {
              document.querySelector("#site-search-input > div > form > button.ais-SearchBox-submit").click();
            }, 64);
          } else {
            openSearch();
          }
  
          return false;
        }
      });
    }

    const closeSearch = () => {
      btf.animateOut($searchDialog, "search_close .5s");
      btf.animateOut($searchMask, "to_hide 0.5s");
      window.removeEventListener("resize", fixSafariHeight);
    };

    // fix safari
    const fixSafariHeight = () => {
      if (window.innerWidth < 768) {
        $searchDialog.style.setProperty("--search-height", window.innerHeight + "px");
      }
    };

    const searchClickFn = () => {
      btf.addEventListenerPjax(document.querySelector("#search-button > .search"), "click", openSearch);
    };
  
    const searchFnOnce = () => {
      $searchMask.addEventListener("click", closeSearch);
      document.querySelector("#site-search .search-close-button").addEventListener("click", closeSearch);
    };
  
    const initSearch = () => {
      const searchConfig = GLOBAL_CONFIG.search;
      var searchClient;
      var indexName;

      if(searchConfig.engine == 'algolia') {
        const config = searchConfig.algolia;
        const isAlgoliaValid = config.appId && config.apiKey && config.indexName;
        if (!isAlgoliaValid) {
          return console.error("Algolia Search setting is invalid!");
        }
        searchClient = algoliasearch(config.appId, config.apiKey);
        indexName = config.indexName;
      } else if (searchConfig.engine == 'meilisearch') {
        const config = searchConfig.meilisearch;
        const isAlgoliaValid = config.host && config.apiKey && config.indexName;
        if (!isAlgoliaValid) {
          return console.error("Algolia Search setting is invalid!");
        }
        searchClient = instantMeiliSearch(config.host, config.apiKey).searchClient;
        indexName = config.indexName;
      }
    
      const search = instantsearch({
        indexName: indexName,
        searchClient: searchClient,
        searchFunction(helper) {
          if (helper.state.query) {
            let innerLoading = '<i class="icon-spinner spin"></i>';
            document.getElementById("algolia-hits").innerHTML = innerLoading;
            helper.search();
          }
        },
      });
    
      const configure = instantsearch.widgets.configure({
        hitsPerPage: searchConfig.hits.per_page ?? 5,
      });
    
      const searchBox = instantsearch.widgets.searchBox({
        container: "#site-search-input",
        showReset: false,
        showSubmit: false,
        placeholder: searchConfig.languages.input_placeholder,
        showLoadingIndicator: true,
        searchOnEnterKeyPressOnly: true,
        searchAsYouType: true,
      });
    
      const algoliaHitItemTemplate = function (hit, { html, components }) {
        const link = hit.url ? hit.url : GLOBAL_CONFIG.root + hit.path;
        const result = hit._highlightResult;
        return `
          <a href="${link}" class="algolia-hit-item-link">
          <span class="algolia-hits-item-title">${result.content.value || "no-title"}</span>
          </a>`;
      };

      const meilisearchHitItemTemplate = function (hit, { html, components }) {
        const group = hit;
        const items = hit.items;

        return `
          <div class="search-result-group">
              <a href="${group.url}" class="algolia-hit-item-link search-result-title">
                  ${group.title ? `<i class="icon-book-open"></i>` : ''}
                  ${group.category ? `<span class="category">${group.category}</span> | ` : ''}
                  <span>${group.title}</span>
                  ${group.description ? `<span>${group.description}</span>` : ''}
              </a>
              <div class="group-items">
                  ${items.map((item) => `
                    <a href="${item.url}" class="algolia-hit-item-link">
                      <div class="search-result-item">
                        <div class="search-result-chapter">
                          ${item.hierarchy_lvl3 ? `<span>${item._highlightResult.hierarchy_lvl3.value}</span>` : ''}
                          ${item.hierarchy_lvl4 ? `<span> > ${item._highlightResult.hierarchy_lvl4.value}</span>` : ''}
                          ${item.hierarchy_lvl5 ? `<span> > ${item._highlightResult.hierarchy_lvl5.value}</span>` : ''}
                        </div>
                        <div class="search-result-content">
                          ${item.content ? `<span>${item._highlightResult.content.value}</span>` : ''}
                        </div>
                      </div>
                    </a>
                  `).join('')}
              </div>
          </div>
          `;
      };

      const hits = instantsearch.widgets.hits({
        container: "#algolia-hits",
        transformItems: (items) => { // 对搜索结果进行分组
          if (searchConfig.engine == 'algolia') {
            return items;
          }
          const groupedItems = {};
          items.forEach((item) => {
              const groupKey = item.hierarchy_lvl2 || 'Uncategorized'; // 以文章标题作为分组键
              if (!groupedItems[groupKey]) {
                  groupedItems[groupKey] = {
                      category: item.hierarchy_lvl0 ? item._highlightResult.hierarchy_lvl0.value : "",
                      tag: item.hierarchy_lvl1 ? item._highlightResult.hierarchy_lvl1.value : "",
                      title: item.hierarchy_lvl2 ? item._highlightResult.hierarchy_lvl2.value : "",
                      url: item.url.split("#")[0], // 去除锚点
                      // 如果描述没有高亮结果,则不在搜索结果展示
                      description: item.hierarchy_lvl3 && item.hierarchy_lvl3 !== item._highlightResult.hierarchy_lvl3.value ? item._highlightResult.hierarchy_lvl3.value : "",
                      items: [],
                  };
              }
              groupedItems[groupKey].items.push(item);
          });

          // 将分组后的数据转换为数组
          return Object.values(groupedItems);
        },
        templates: {
          item(hit, { html, components }) {
            const loadingLogo = document.querySelector("#algolia-hits .icon-spinner");
            if (loadingLogo) {
              loadingLogo.style.display = "none";
            }
            setTimeout(() => {
              document.querySelector("#site-search .ais-SearchBox-input").focus();
            }, 200);
            console.log(hit);
            if (searchConfig.engine == 'meilisearch') {
              return meilisearchHitItemTemplate(hit, { html, components });
            }
            else if (searchConfig.engine == 'algolia') {
              return algoliaHitItemTemplate(hit, { html, components });
            }
          },
          empty: function (data) {
            const loadingLogo = document.querySelector("#algolia-hits .icon-spinner");
            console.info(loadingLogo);
            if (loadingLogo) {
              loadingLogo.style.display = "none";
            }
            setTimeout(() => {
              document.querySelector("#site-search .ais-SearchBox-input").focus();
            }, 200);
            return (
              '<div id="algolia-hits-empty">' +
              GLOBAL_CONFIG.search.languages.hits_empty.replace(/\$\{query}/, data.query) +
              "</div>"
            );
          },
        },
        cssClasses: {
          item: "algolia-hit-item",
        },
      });
    
      const stats = instantsearch.widgets.stats({
        container: "#search-info > .search-stats",
        templates: {
          text: function (data) {
            const stats = GLOBAL_CONFIG.search.languages.hits_stats
              .replace(/\$\{hits}/, data.nbHits)
              .replace(/\$\{time}/, data.processingTimeMS);
            return `<hr>${stats}`;
          },
        },
      });
    
      const pagination = instantsearch.widgets.pagination({
        container: "#search-pagination",
        totalPages: searchConfig.hits.per_page ?? 5,
        templates: {
          first: '<i class="icon-angle-double-left"></i>',
          last: '<i class="icon-angle-double-right"></i>',
          previous: '<i class="icon-angle-left"></i>',
          next: '<i class="icon-angle-right"></i>',
        },
        scrollTo: false,
        showFirstLast: false,
        cssClasses: {
          root: "pagination",
          item: "pagination-item",
          link: "page-number",
          active: "current",
          disabled: "disabled-item",
        },
      });
    
      search.addWidgets([configure, searchBox, hits, stats, pagination]);

      search.start();

      window.pjax && search.on("render", () => {
        window.pjax.refresh(document.getElementById("algolia-hits"));
      });   
    };

    searchClickFn();
    searchFnOnce();
  
    window.addEventListener("pjax:complete", () => {
      !btf.isHidden($searchMask) && closeSearch();
      searchClickFn();
    });
  });