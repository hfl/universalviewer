import BaseCommands = require("../uv-shared-module/BaseCommands");
import Commands = require("../../extensions/uv-seadragon-extension/Commands");
import CenterPanel = require("../uv-shared-module/CenterPanel");
import ISeadragonExtension = require("../../extensions/uv-seadragon-extension/ISeadragonExtension");
import ExternalResource = require("../../modules/uv-shared-module/ExternalResource");
import Params = require("../../Params");
import Point = require("../../modules/uv-shared-module/Point");
import SearchResult = require("../../extensions/uv-seadragon-extension/SearchResult");
import SearchResultRect = require("../../extensions/uv-seadragon-extension/SearchResultRect");

class SeadragonCenterPanel extends CenterPanel {

    controlsVisible: boolean = false;
    currentBounds: any;
    handler: any;
    initialBounds: any;
    initialRotation: any;
    isCreated: boolean = false;
    isFirstLoad: boolean = true;
    nextButtonEnabled: boolean = false;
    pages: Manifesto.IExternalResource[];
    prevButtonEnabled: boolean = false;
    title: string;
    userData: any;
    viewer: any;

    $goHomeButton: JQuery;
    $rightButton: JQuery;
    $leftButton: JQuery;
    $rotateButton: JQuery;
    $spinner: JQuery;
    $viewer: JQuery;
    $zoomInButton: JQuery;
    $zoomOutButton: JQuery;
    $navigator: JQuery;

    constructor($element: JQuery) {
        super($element);
    }

    create(): void {

        this.setConfig('seadragonCenterPanel');

        super.create();

        this.$viewer = $('<div id="viewer"></div>');
        this.$content.prepend(this.$viewer);

        $.subscribe(BaseCommands.OPEN_EXTERNAL_RESOURCE, (e, resources: Manifesto.IExternalResource[]) => {
            Utils.Async.waitFor(() => {
                return this.isResized;
            }, () => {
                if (!this.isCreated) this.createUI();
                this.openMedia(resources);
            });
        });
    }

    createUI(): void {
        this.$spinner = $('<div class="spinner"></div>');
        this.$content.append(this.$spinner);

        this.showAttribution();

        // todo: use compiler flag (when available)
        var prefixUrl = (window.DEBUG)? 'modules/uv-seadragoncenterpanel-module/img/' : 'themes/' + this.extension.config.options.theme + '/img/uv-seadragoncenterpanel-module/';

        // add to window object for testing automation purposes.
        window.openSeadragonViewer = this.viewer = OpenSeadragon({
            id: "viewer",
            ajaxWithCredentials: false,
            showNavigationControl: true,
            showNavigator: true,
            showRotationControl: true,
            showHomeControl: this.config.options.showHomeControl || false,
            showFullPageControl: false,
            defaultZoomLevel: this.config.options.defaultZoomLevel || 0,
            controlsFadeDelay: this.config.options.controlsFadeDelay || 250,
            controlsFadeLength: this.config.options.controlsFadeLength || 250,
            navigatorPosition: this.config.options.navigatorPosition || "BOTTOM_RIGHT",
            animationTime: this.config.options.animationTime || 1.2,
            visibilityRatio: this.config.options.visibilityRatio || 0.5,
            constrainDuringPan: this.config.options.constrainDuringPan || false,
            immediateRender: this.config.options.immediateRender || false,
            maxZoomLevel: this.config.options.maxZoomLevel || null,
            blendTime: this.config.options.blendTime || 0,
            autoHideControls: this.config.options.autoHideControls == null ? true : this.config.options.autoHideControls,
            prefixUrl: prefixUrl,
            navImages: {
                zoomIn: {
                    REST:   'zoom_in.png',
                    GROUP:  'zoom_in.png',
                    HOVER:  'zoom_in.png',
                    DOWN:   'zoom_in.png'
                },
                zoomOut: {
                    REST:   'zoom_out.png',
                    GROUP:  'zoom_out.png',
                    HOVER:  'zoom_out.png',
                    DOWN:   'zoom_out.png'
                },
                home: {
                    REST:   'home.png',
                    GROUP:  'home.png',
                    HOVER:  'home.png',
                    DOWN:   'home.png'
                },
                rotateright: {
                    REST:   'rotate_right.png',
                    GROUP:  'rotate_right.png',
                    HOVER:  'rotate_right.png',
                    DOWN:   'rotate_right.png'
                },
                rotateleft: {
                    REST:   'pixel.gif',
                    GROUP:  'pixel.gif',
                    HOVER:  'pixel.gif',
                    DOWN:   'pixel.gif'
                },
                next: {
                    REST:   'pixel.gif',
                    GROUP:  'pixel.gif',
                    HOVER:  'pixel.gif',
                    DOWN:   'pixel.gif'
                },
                previous: {
                    REST:   'pixel.gif',
                    GROUP:  'pixel.gif',
                    HOVER:  'pixel.gif',
                    DOWN:   'pixel.gif'
                }
            }
        });

        this.$zoomInButton = this.$viewer.find('div[title="Zoom in"]');
        this.$zoomInButton.attr('tabindex', 11);
        this.$zoomInButton.prop('title', this.content.zoomIn);
        this.$zoomInButton.addClass('zoomIn');

        this.$zoomOutButton = this.$viewer.find('div[title="Zoom out"]');
        this.$zoomOutButton.attr('tabindex', 12);
        this.$zoomOutButton.prop('title', this.content.zoomOut);
        this.$zoomOutButton.addClass('zoomOut');

        this.$goHomeButton = this.$viewer.find('div[title="Go home"]');
        this.$goHomeButton.attr('tabindex', 13);
        this.$goHomeButton.prop('title', this.content.goHome);
        this.$goHomeButton.addClass('goHome');

        this.$rotateButton = this.$viewer.find('div[title="Rotate right"]');
        this.$rotateButton.attr('tabindex', 14);
        this.$rotateButton.prop('title', this.content.rotateRight);
        this.$rotateButton.addClass('rotate');
        
        this.$navigator = this.$viewer.find(".navigator");
        this.setNavigatorVisible();

        // events

        this.$element.on('mousemove', (e) => {
            if (this.controlsVisible) return;
            this.controlsVisible = true;
            this.viewer.setControlsEnabled(true);
        });

        this.$element.on('mouseleave', (e) => {
            if (!this.controlsVisible) return;
            this.controlsVisible = false;
            this.viewer.setControlsEnabled(false);
        });

        // when mouse move stopped
        this.$element.on('mousemove', (e) => {
            // if over element, hide controls.
            if (!this.$viewer.find('.navigator').ismouseover()){
                if (!this.controlsVisible) return;
                this.controlsVisible = false;
                this.viewer.setControlsEnabled(false);
            }
        }, this.config.options.controlsFadeAfterInactive);

        // this.viewer.addHandler('open', (viewer) => {
        //     $.publish(Commands.SEADRAGON_OPEN, [viewer]);
        //     this.openPagesHandler();
        // });

        this.viewer.addHandler('tile-drawn', () => {
            this.$spinner.hide();
        });

        //this.viewer.addHandler("open-failed", () => {
        //});

        this.viewer.addHandler('resize', (viewer) => {
            $.publish(Commands.SEADRAGON_RESIZE, [viewer]);
            this.viewerResize(viewer);
        });

        this.viewer.addHandler('animation-start', (viewer) => {
            $.publish(Commands.SEADRAGON_ANIMATION_START, [viewer]);
        });

        this.viewer.addHandler('animation', (viewer) => {
            $.publish(Commands.SEADRAGON_ANIMATION, [viewer]);
        });

        this.viewer.addHandler('animation-finish', (viewer) => {
            this.currentBounds = this.getBounds();

            $.publish(Commands.SEADRAGON_ANIMATION_FINISH, [viewer]);
        });

        this.$rotateButton.on('click', () => {
            $.publish(Commands.SEADRAGON_ROTATION, [this.viewer.viewport.getRotation()]);
        });

        this.title = this.extension.helper.getLabel();

        this.createNavigationButtons();

        this.hidePrevButton();
        this.hideNextButton();

        // if firefox, hide rotation and prev/next until this is resolved
        //var browser = window.browserDetect.browser;

        //if (browser == 'Firefox') {
        //    if (this.provider.isMultiCanvas()){
        //        this.$leftButton.hide();
        //        this.$rightButton.hide();
        //    }
        //    this.$rotateButton.hide();
        //}

        this.isCreated = true;

        this.resize();
    }

    createNavigationButtons() {

        this.$leftButton = $('<div class="paging btn prev"></div>');
        this.$leftButton.prop('title', this.content.previous);
        this.viewer.addControl(this.$leftButton[0], {anchor: OpenSeadragon.ControlAnchor.TOP_LEFT});

        this.$rightButton = $('<div class="paging btn next"></div>');
        this.$rightButton.prop('title', this.content.next);
        this.viewer.addControl(this.$rightButton[0], {anchor: OpenSeadragon.ControlAnchor.TOP_RIGHT});

        var that = this;

        var viewingDirection: Manifesto.ViewingDirection = this.extension.helper.getViewingDirection();

        this.$leftButton.on('touchstart click', (e) => {
            e.preventDefault();
            OpenSeadragon.cancelEvent(e);

            if (!that.prevButtonEnabled) return;

            switch (viewingDirection.toString()){
                case manifesto.ViewingDirection.leftToRight().toString():
                    $.publish(Commands.PREV);
                    break;
                case manifesto.ViewingDirection.rightToLeft().toString() :
                    $.publish(Commands.NEXT);
                    break;
            }
        });

        this.$rightButton.on('touchstart click', (e) => {
            e.preventDefault();
            OpenSeadragon.cancelEvent(e);

            if (!that.nextButtonEnabled) return;

            switch (viewingDirection.toString()){
                case manifesto.ViewingDirection.leftToRight().toString():
                    $.publish(Commands.NEXT);
                    break;
                case manifesto.ViewingDirection.rightToLeft().toString() :
                    $.publish(Commands.PREV);
                    break;
            }
        });
    }

    openMedia(resources?: Manifesto.IExternalResource[]): void {

        this.$spinner.show();

        this.extension.getExternalResources(resources).then((resources: Manifesto.IExternalResource[]) => {
            // OSD can open an array info.json objects
            //this.viewer.open(resources);

            this.viewer.close();

            resources = this.getPagePositions(resources);

            for (var i = 0; i < resources.length; i++){
                var resource: Manifesto.IExternalResource = resources[i];
                this.viewer.addTiledImage({
                    tileSource: resource['@id'] + '/info.json',
                    x: (<any>resource).x,
                    y: (<any>resource).y,
                    width: (<any>resource).width
                });
            }

            this.openPagesHandler();
        });
    }

    getPagePositions(resources: Manifesto.IExternalResource[]): Manifesto.IExternalResource[] {
        var leftPage: any;
        var rightPage: any;
        var topPage: any;
        var bottomPage: any;
        var page: any;
        var nextPage: any;

        // if there's more than one image, determine alignment strategy
        if (resources.length > 1) {

            if (resources.length === 2) {
                // recto verso
                if (this.extension.helper.isVerticallyAligned()) {
                    // vertical alignment
                    topPage = resources[0];
                    topPage.y = 0;
                    bottomPage = resources[1];
                    bottomPage.y = topPage.height + this.config.options.pageGap;
                } else {
                    // horizontal alignment
                    leftPage = resources[0];
                    leftPage.x = 0;
                    rightPage = resources[1];
                    rightPage.x = leftPage.width + this.config.options.pageGap;
                }
            } else {
                // scroll
                if (this.extension.helper.isVerticallyAligned()) {
                    // vertical alignment
                    if (this.extension.helper.isTopToBottom()) {
                        // top to bottom
                        for (var i = 0; i < resources.length - 1; i++) {
                            page = resources[i];
                            nextPage = resources[i + 1];
                            nextPage.y = (page.y || 0) + page.height;;
                        }
                    } else {
                        // bottom to top
                        for (var i = resources.length; i > 0; i--) {
                            page = resources[i];
                            nextPage = resources[i - 1];
                            nextPage.y = (page.y || 0) - page.height;
                        }
                    }
                } else {
                    // horizontal alignment
                    if (this.extension.helper.isLeftToRight()){
                        // left to right
                        for (var i = 0; i < resources.length - 1; i++){
                            page = resources[i];
                            nextPage = resources[i + 1];
                            nextPage.x = (page.x || 0) + page.width;
                        }
                    } else {
                        // right to left
                        for (var i = resources.length - 1; i > 0; i--){
                            page = resources[i];
                            nextPage = resources[i - 1];
                            nextPage.x = (page.x || 0) - page.width;
                        }
                    }
                }
            }
        }

        return resources;
    }

    // used with viewer.open()
    // keeping around for reference
    
    // positionPages(): void {

    //     var resources: Manifesto.IExternalResource[] = this.extension.resources;

    //     var x: number;
    //     var y: number;
    //     var page: any;
    //     var pageBounds: any;
    //     var nextPage: any;
    //     var nextPagePos: any;
    //     var topPage: any;
    //     var topPageBounds: any;
    //     var bottomPage: any;
    //     var bottomPagePos: any;
    //     var leftPage: any;
    //     var leftPageBounds: any;
    //     var rightPage: any;
    //     var rightPageBounds: any;
    //     var rightPagePos: any;

    //     // if there's more than one image, determine alignment strategy
    //     if (resources.length > 1) {

    //         if (resources.length === 2) {
    //             // recto verso
    //             if (this.extension.helper.isVerticallyAligned()) {
    //                 // vertical alignment
    //                 topPage = this.viewer.world.getItemAt(0);
    //                 topPageBounds = topPage.getBounds(true);
    //                 y = topPageBounds.y + topPageBounds.height;
    //                 bottomPage = this.viewer.world.getItemAt(1);
    //                 bottomPagePos = bottomPage.getBounds(true).getTopLeft();
    //                 bottomPagePos.y = y + this.config.options.pageGap;
    //                 bottomPage.setPosition(bottomPagePos, true);
    //             } else {
    //                 // horizontal alignment
    //                 leftPage = this.viewer.world.getItemAt(0);
    //                 leftPageBounds = leftPage.getBounds(true);
    //                 x = leftPageBounds.x + leftPageBounds.width;
    //                 rightPage = this.viewer.world.getItemAt(1);
    //                 rightPageBounds = rightPage.getBounds(true);
    //                 rightPagePos = rightPageBounds.getTopLeft();
    //                 rightPagePos.x = x + this.config.options.pageGap;
    //                 rightPage.setPosition(rightPagePos, true);

    //                 if (rightPage.source.width > rightPage.source.height){
    //                     rightPage.setWidth(leftPageBounds.width);
    //                 } else {
    //                     rightPage.setHeight(leftPageBounds.height);
    //                 }
    //             }
    //         } else {

    //             // scroll
    //             if (this.extension.helper.isVerticallyAligned()) {
    //                 // vertical alignment
    //                 if (this.extension.helper.isTopToBottom()) {
    //                     // top to bottom
    //                     for (var i = 0; i < resources.length - 1; i++) {
    //                         page = this.viewer.world.getItemAt(i);
    //                         pageBounds = page.getBounds(true);
    //                         y = pageBounds.y + pageBounds.height;
    //                         nextPage = this.viewer.world.getItemAt(i + 1);
    //                         nextPagePos = nextPage.getBounds(true).getTopLeft();
    //                         nextPagePos.y = y;
    //                         nextPage.setPosition(nextPagePos, true);
    //                     }
    //                 } else {
    //                     // bottom to top
    //                     for (var i = resources.length; i > 0; i--) {
    //                         page = this.viewer.world.getItemAt(i);
    //                         pageBounds = page.getBounds(true);
    //                         y = pageBounds.y - pageBounds.height;
    //                         nextPage = this.viewer.world.getItemAt(i - 1);
    //                         nextPagePos = nextPage.getBounds(true).getTopLeft();
    //                         nextPagePos.y = y;
    //                         nextPage.setPosition(nextPagePos, true);
    //                     }
    //                 }
    //             } else {
    //                 // horizontal alignment
    //                 if (this.extension.helper.isLeftToRight()){
    //                     // left to right
    //                     for (var i = 0; i < resources.length - 1; i++){
    //                         page = this.viewer.world.getItemAt(i);
    //                         pageBounds = page.getBounds(true);
    //                         x = pageBounds.x + pageBounds.width;
    //                         nextPage = this.viewer.world.getItemAt(i + 1);
    //                         nextPagePos = nextPage.getBounds(true).getTopLeft();
    //                         nextPagePos.x = x;
    //                         nextPage.setPosition(nextPagePos, true);
    //                     }
    //                 } else {
    //                     // right to left
    //                     for (var i = resources.length - 1; i > 0; i--){
    //                         page = this.viewer.world.getItemAt(i);
    //                         pageBounds = page.getBounds(true);
    //                         x = pageBounds.x - pageBounds.width;
    //                         nextPage = this.viewer.world.getItemAt(i - 1);
    //                         nextPagePos = nextPage.getBounds(true).getTopLeft();
    //                         nextPagePos.x = x;
    //                         nextPage.setPosition(nextPagePos, true);
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }

    openPagesHandler() {

        $.publish(Commands.SEADRAGON_OPEN);

        // check for initial zoom/rotation params.
        if (this.isFirstLoad){

            this.initialRotation = this.extension.getParam(Params.rotation);

            if (this.initialRotation){
                this.viewer.viewport.setRotation(parseInt(this.initialRotation));
            }

            this.initialBounds = this.extension.getParam(Params.zoom);

            if (this.initialBounds){
                this.initialBounds = this.deserialiseBounds(this.initialBounds);
                this.currentBounds = this.initialBounds;
                this.fitToBounds(this.currentBounds);
            } else {
                this.goHome();
            }
        } else {
            // it's not the first load
            var settings: ISettings = this.extension.getSettings();

            // zoom to bounds unless setting disabled
            if (settings.preserveViewport && this.currentBounds){
                this.fitToBounds(this.currentBounds);
            } else {
                this.goHome();
            }
        }

        if (this.extension.helper.isMultiCanvas() && !this.extension.helper.isContinuous()) {

            this.showPrevButton();
            this.showNextButton();

            $('.navigator').addClass('extraMargin');

            if (!this.extension.helper.isFirstCanvas()) {
                this.enablePrevButton();
            } else {
                this.disablePrevButton();
            }

            if (!this.extension.helper.isLastCanvas()) {
                this.enableNextButton();
            } else {
                this.disableNextButton();
            }
        }
        
        this.setNavigatorVisible();

        this.isFirstLoad = false;
        this.overlaySearchResults();
    }

    goHome(): void {
        
        this.viewer.viewport.goHome();
        
        // var viewingDirection: string = this.extension.helper.getViewingDirection().toString();

        // switch (viewingDirection.toString()){
        //     case manifesto.ViewingDirection.topToBottom().toString() :
        //         this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(0, 0, 1, this.viewer.world.getItemAt(0).normHeight * this.extension.resources.length), true);
        //         break;
        //     case manifesto.ViewingDirection.leftToRight().toString() :
        //     case manifesto.ViewingDirection.rightToLeft().toString() :
        //         this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(0, 0, (<any>this.extension.resources[0]).width + (<any>this.extension.resources[1]).width, (<any>this.extension.resources[0]).height), true);
        //         break;
        // }
    }

    disablePrevButton(): void {
        this.prevButtonEnabled = false;
        this.$leftButton.addClass('disabled');
    }

    enablePrevButton(): void {
        this.prevButtonEnabled = true;
        this.$leftButton.removeClass('disabled');
    }

    hidePrevButton(): void {
        this.disablePrevButton();
        this.$leftButton.hide();
    }

    showPrevButton(): void {
        this.enablePrevButton();
        this.$leftButton.show();
    }

    disableNextButton(): void {
        this.nextButtonEnabled = false;
        this.$rightButton.addClass('disabled');
    }

    enableNextButton(): void {
        this.nextButtonEnabled = true;
        this.$rightButton.removeClass('disabled');
    }

    hideNextButton(): void {
        this.disableNextButton();
        this.$rightButton.hide();
    }

    showNextButton(): void {
        this.enableNextButton();
        this.$rightButton.show();
    }

    serialiseBounds(bounds): string{
        return bounds.x + ',' + bounds.y + ',' + bounds.width + ',' + bounds.height;
    }

    deserialiseBounds(bounds: string): any {

        var boundsArr = bounds.split(',');

        return {
            x: Number(boundsArr[0]),
            y: Number(boundsArr[1]),
            width: Number(boundsArr[2]),
            height: Number(boundsArr[3])
        };
    }

    fitToBounds(bounds): void {
        var rect = new OpenSeadragon.Rect();
        rect.x = bounds.x;
        rect.y = bounds.y;
        rect.width = bounds.width;
        rect.height = bounds.height;

        this.viewer.viewport.fitBounds(rect, true);
    }

    getBounds(): any {

        if (!this.viewer || !this.viewer.viewport) return null;

        var bounds = this.viewer.viewport.getBounds(true);

        return {
            x: Math.roundToDecimalPlace(bounds.x, 4),
            y: Math.roundToDecimalPlace(bounds.y, 4),
            width: Math.roundToDecimalPlace(bounds.width, 4),
            height: Math.roundToDecimalPlace(bounds.height, 4)
        };
    }

    viewerResize(viewer: any): void {

        if (!viewer.viewport) return;

        var center = viewer.viewport.getCenter(true);
        if (!center) return;

        // postpone pan for a millisecond - fixes iPad image stretching/squashing issue.
        setTimeout(function () {
            viewer.viewport.panTo(center, true);
        }, 1);
    }

    overlaySearchResults(): void {

        var searchResults = (<ISeadragonExtension>this.extension).searchResults;

        if (!searchResults.length) return;

        var indices = this.extension.getPagedIndices();

        for (var i = 0; i < indices.length; i++){
            var canvasIndex = indices[i];

            var searchHit: SearchResult = null;

            for (var j = 0; j < searchResults.length; j++) {
                if (searchResults[j].canvasIndex === canvasIndex) {
                    searchHit = searchResults[j];
                    break;
                }
            }

            if (!searchHit) continue;

            var rects = this.getSearchOverlayRects(searchHit.rects, i);

            for (var k = 0; k < rects.length; k++) {
                var rect = rects[k];

                var div = document.createElement("div");
                div.className = "searchOverlay";

                this.viewer.addOverlay(div, rect);
            }
        }
    }

    getSearchOverlayRects(rects: SearchResultRect[], index: number) {
        var newRects = [];

        var width = (<any>this.extension.resources[index]).width;// this.viewer.world.getItemAt(index).source.dimensions.x;
        var offsetX = 0;

        if (index > 0){
            offsetX = (<any>this.extension.resources[index - 1]).width;// this.viewer.world.getItemAt(index - 1).source.dimensions.x;
        }

        for (var i = 0; i < rects.length; i++) {
            var searchRect: SearchResultRect = rects[i];

            var x = (Number(searchRect.x) + offsetX) + ((index > 0) ? this.config.options.pageGap : 0);
            var y = Number(searchRect.y);
            var w = Number(searchRect.width);
            var h = Number(searchRect.height);

            var rect = new OpenSeadragon.Rect(x, y, w, h);

            newRects.push(rect);
        }

        return newRects;
    }

    resize(): void {

        super.resize();

        this.$viewer.height(this.$content.height() - this.$viewer.verticalMargins());
        this.$viewer.width(this.$content.width() - this.$viewer.horizontalMargins());

        if (!this.isCreated) return;

        if (this.currentBounds) {
            this.fitToBounds(this.currentBounds);
        }

        this.$title.ellipsisFill(this.extension.sanitize(this.title));

        this.$spinner.css('top', (this.$content.height() / 2) - (this.$spinner.height() / 2));
        this.$spinner.css('left', (this.$content.width() / 2) - (this.$spinner.width() / 2));

        if (this.extension.helper.isMultiCanvas() && this.$leftButton && this.$rightButton) {
            this.$leftButton.css('top', (this.$content.height() - this.$leftButton.height()) / 2);
            this.$rightButton.css('top', (this.$content.height() - this.$rightButton.height()) / 2);
        }

        // stretch navigator, allowing time for OSD to resize
        setTimeout(() => {
            if (this.extension.helper.isContinuous()){
                if (this.extension.helper.isHorizontallyAligned()){
                    var width: number = this.$viewer.width() - this.$viewer.rightMargin();
                    this.$navigator.width(width);
                } else {
                    this.$navigator.height(this.$viewer.height());
                }
            }
        }, 100);
    }

    setFocus(): void {
        var $canvas = $(this.viewer.canvas);

        if (!$canvas.is(":focus"))
            $canvas.focus();
    }
    
    setNavigatorVisible() {
        var navigatorEnabled = Utils.Bools.getBool(this.extension.getSettings().navigatorEnabled, true);

        this.viewer.navigator.setVisible(navigatorEnabled);
        
        if (navigatorEnabled)
            this.$navigator.show();
        else
            this.$navigator.hide();
    }
}
export = SeadragonCenterPanel;