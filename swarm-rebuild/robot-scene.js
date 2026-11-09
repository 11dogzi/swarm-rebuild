/* Smart Robot Animation — page capture, robot choreography and live reveal. */
(() => {
  "use strict";

  const SESSION_HANDLE = "__smartRobotAnimation";
  if (window[SESSION_HANDLE]) {
    window[SESSION_HANDLE].togglePlayback();
    return;
  }
  const ROBOT_CALLSIGNS = [
    "Ada",
    "Linus",
    "Grace",
    "Alan",
    "Margaret",
    "Ken",
    "Barbara",
    "Dennis",
    "Radia",
    "Guido",
    "Frances",
    "Bjarne",
    "Hedy",
    "Tim",
    "Katherine",
    "Edsger",
    "Joan",
    "Donald",
    "Sophie",
    "Niklaus",
    "Anita",
    "Brian",
    "Mary",
    "Rob",
    "Ida",
    "Yukihiro",
    "Shafi",
    "Leslie",
    "Jean",
    "Vint",
    "Lynn",
    "Bram",
  ];
  const MONOCHROME_PALETTE = ["#000", "#fff"];
  const ENGINEER_TINT = "#884ffe";
  const AXIS_VIOLET = "#884ffe";
  const AXIS_LIME = "#84ff00";
  const RULER_THICKNESS = 20;
  const CREW_MINIMUM = 8;
  const CREW_LIMIT = 48;
  const LAUNCH_CREW_SIZE = 18;
  const FRAGMENT_LIMIT = 4000;
  const DOCUMENT_HEIGHT_LIMIT = 40000;
  const VECTOR_NAMESPACE = "http://www.w3.org/2000/svg";
  const sampleRange = (firstValue, secondValue) => firstValue + Math.random() * (secondValue - firstValue);
  const limitRange = (record, firstValue, secondValue) => Math.max(firstValue, Math.min(secondValue, record));
  const smoothTravel = (phaseValue) =>
    phaseValue < 0.5 ? 4 * phaseValue * phaseValue * phaseValue : 1 - Math.pow(-2 * phaseValue + 2, 3) / 2;
  const settleTravel = (phaseValue) => 1 - Math.pow(1 - phaseValue, 3);
  const invalidateFragment = (fragment) => {
    fragment.revision++;
  };
  const delayFor = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const awaitPaint = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const pixelDecimal = (quantity) => Math.round(quantity * 10) / 10;
  function revealStartsAtRight(fragment, viewportState) {
    const originX = fragment.layer === "world" ? viewportState.sx : viewportState.ox;
    const centerX = fragment.x + fragment.w / 2;
    return centerX - originX > viewportState.vw * 0.6;
  }
  function readColorOpacity(candidate) {
    if (!candidate || candidate === "transparent") return 0;
    const slash = candidate.match(/\/\s*([\d.]+%?)\s*\)/);
    if (slash) return slash[1].endsWith("%") ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
    const entry = candidate.match(/^rgba\(([^)]+)\)/);
    if (entry) {
      const point = entry[1].split(",");
      return point.length >= 4 ? parseFloat(point[3]) : 1;
    }
    return 1;
  }
  function overlapBounds(firstValue, secondValue) {
    if (!firstValue || !secondValue) return null;
    const leftEdge = Math.max(firstValue.l, secondValue.l);
    const phaseValue = Math.max(firstValue.t, secondValue.t);
    const rectangle = Math.min(firstValue.r, secondValue.r);
    const bottomEdge = Math.min(firstValue.b, secondValue.b);
    return rectangle > leftEdge && bottomEdge > phaseValue
      ? {
          l: leftEdge,
          t: phaseValue,
          r: rectangle,
          b: bottomEdge,
        }
      : null;
  }
  const readEdges = (rectangle) => ({
    l: rectangle.left,
    t: rectangle.top,
    r: rectangle.right,
    b: rectangle.bottom,
  });
  function composeRobotGlyph(shape, color, variant = 0) {
    const specialist = color === ENGINEER_TINT;
    const edge = color === "#fff" ? "#000" : "#fff";
    const design = specialist ? 8 : (variant % 4) + (color === "#000" ? 4 : 0);
    const heads = [
      '<rect x="12" y="7" width="24" height="24" rx="1"/><path d="M16 27h5m6 0h5"/>',
      '<circle cx="24" cy="18" r="13"/><path d="M14 26q10 5 20 0" fill="none"/>',
      '<rect x="5" y="12" width="38" height="14" rx="2"/><path d="M8 16v6m32-6v6"/>',
      '<rect x="17" y="2" width="14" height="32" rx="2"/><path d="M20 27h8m-8 3h8"/>',
      '<path d="M24 3l15 15-15 15L9 18z"/><path d="M21 27h6"/>',
      '<ellipse cx="24" cy="18" rx="10" ry="15"/><path d="M15 9l-5-5m23 5 5-5"/>',
      '<path d="M12 10h24l7 18H5z"/><path d="M12 28v3m24-3v3"/>',
      '<path d="M24 2l8 7v18l-8 8-8-8V9z"/><path d="M20 28h8"/>',
      '<path d="M10 6h28v25H10z"/><path d="M10 12H5v12h5m28-12h5v12h-5M15 31v4h6m6 0h6v-4"/>',
    ];
    const faces = [
      '<rect x="16" y="12" width="16" height="11" rx="1"/>',
      '<circle cx="24" cy="17" r="8"/>',
      '<rect x="12" y="15" width="24" height="8" rx="1"/>',
      '<rect x="20" y="7" width="8" height="16" rx="3"/>',
      '<path d="M24 9l9 9-9 9-9-9z"/>',
      '<path d="M17 13q7-5 14 0v9q-7 5-14 0z"/>',
      '<path d="M15 15h18l3 8H12z"/>',
      '<path d="M20 10h8v13l-4 4-4-4z"/>',
      '<rect x="14" y="11" width="20" height="13" rx="1"/>',
    ];
    const eyes = [
      '<path d="M19 15h3v4h-3zm7 0h3v4h-3z"/>',
      '<circle cx="24" cy="17" r="4"/>',
      '<path d="M16 17h4v3h-4zm12 0h4v3h-4z"/>',
      '<circle cx="24" cy="11" r="2"/><circle cx="24" cy="18" r="2"/>',
      '<path d="M19 15l4 2-2 3zm10 0-4 2 2 3z"/>',
      '<rect x="19" y="16" width="10" height="3" rx="1.5"/>',
      '<path d="M16 18h3v3h-3zm7-1h3v4h-3zm7 1h3v3h-3z"/>',
      '<path d="M22 12h4v8h-4zm1 10h2v2h-2z"/>',
      '<path d="M17 15h4v5h-4zm10 0h4v5h-4zM20 26h8v2h-8z"/>',
    ][design];
    let tool = '<circle cx="5" cy="37" r="1.5"/>';
    if (shape === "ibeam") tool = '<path d="M1 34h8m-8 6h8m-4-6v6m6-3h5"/>';
    else if (shape.startsWith("pen")) tool = '<path d="M5 37l2-7 4 4zM7 30l4-4 4 4-4 4"/>';
    else if (shape === "dup")
      tool = '<rect x="2" y="33" width="7" height="7" rx="1"/><path d="M5 33v-3h7v7H9"/>';
    else if (shape === "cross" || shape === "ew" || shape === "ns") tool = '<path d="M5 32v10m-5-5h10"/>';
    return (
      '<g class="robot-jet" fill="' +
      edge +
      '"><path d="M19 30l2 9 3-5 3 5 2-9z"/></g>' +
      '<g class="robot-body" stroke="' +
      edge +
      '" stroke-width="1.4" stroke-linejoin="round">' +
      '<g fill="none" class="robot-legs"><path d="' +
      (variant === 3
        ? "M20 34v4h-4m12-4v4h4"
        : variant === 2
          ? "M12 26v5H8m28-5v5h4"
          : "M18 30v5h-4m16-5v5h4") +
      '"/></g>' +
      '<g fill="' +
      color +
      '">' +
      heads[design] +
      "</g>" +
      '<g fill="' +
      edge +
      '" stroke="none">' +
      faces[design] +
      "</g>" +
      '<g class="robot-eyes" fill="' +
      (specialist ? "#111" : color) +
      '" stroke="none">' +
      eyes +
      "</g>" +
      '<path class="robot-warning-eye" d="M24 14v5m0 3v.5" stroke="' +
      color +
      '" stroke-width="2"/>' +
      '<path class="robot-arm" d="' +
      (variant === 3 ? "M17 23L10 28 5 32" : variant === 2 ? "M8 24L5 28 5 32" : "M13 24L9 29 5 32") +
      '" fill="none"/>' +
      '<path d="' +
      (variant === 3 ? "M31 23l6 3-2 4" : variant === 2 ? "M40 24l2 4-2 3" : "M36 22l4 4-2 3") +
      '" fill="none"/>' +
      '</g><g class="robot-tool" fill="none" stroke="' +
      color +
      '" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 1px ' +
      edge +
      ')">' +
      tool +
      "</g>"
    );
  }
  const MEDIA_PLACEHOLDER_GLYPH =
    '<svg class="ph" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18 L10 13 L14 16 L17 13.5 L21 17"/></svg>';
  const IGNORED_TAGS = new Set([
    "script",
    "style",
    "noscript",
    "template",
    "head",
    "meta",
    "link",
    "title",
    "base",
    "datalist",
    "area",
    "map",
    "source",
    "track",
    "param",
    "robot-animation-stage",
  ]);
  const UNSAFE_CLONE_TAGS = new Set([
    "script",
    "style",
    "noscript",
    "template",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
  ]);
  const EXTERNAL_CONTENT_TAGS = new Set([
    "img",
    "svg",
    "video",
    "canvas",
    "iframe",
    "embed",
    "object",
    "picture",
  ]);
  const EDITABLE_TAGS = new Set(["input", "textarea", "select"]);
  const INDIVISIBLE_TAGS = new Set([
    "img",
    "svg",
    "video",
    "canvas",
    "input",
    "select",
    "textarea",
    "iframe",
    "picture",
    "button",
  ]);
  const TYPOGRAPHY_STYLE_KEYS = [
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "font-variant",
    "font-stretch",
    "font-feature-settings",
    "font-variation-settings",
    "font-kerning",
    "font-optical-sizing",
    "line-height",
    "letter-spacing",
    "word-spacing",
    "text-transform",
    "text-align",
    "text-indent",
    "text-decoration-line",
    "text-decoration-color",
    "text-decoration-style",
    "text-decoration-thickness",
    "text-underline-offset",
    "text-shadow",
    "white-space",
    "white-space-collapse",
    "text-wrap-mode",
    "text-wrap-style",
    "direction",
    "overflow-wrap",
    "word-break",
    "hyphens",
    "tab-size",
    "-webkit-text-fill-color",
    "-webkit-text-stroke-width",
    "-webkit-text-stroke-color",
    "text-rendering",
    "-webkit-font-smoothing",
    "list-style-type",
    "list-style-position",
    "list-style-image",
    "writing-mode",
  ];
  const SURFACE_STYLE_KEYS = [
    "display",
    "box-sizing",
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
    "background-color",
    "background-image",
    "background-size",
    "background-position",
    "background-repeat",
    "background-clip",
    "-webkit-background-clip",
    "box-shadow",
    "opacity",
    "vertical-align",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "flex-direction",
    "flex-wrap",
    "align-items",
    "justify-content",
    "gap",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "align-self",
    "object-fit",
    "object-position",
    "overflow-x",
    "overflow-y",
    "text-overflow",
    "-webkit-line-clamp",
    "-webkit-box-orient",
    "visibility",
    "transform",
    "filter",
    "float",
    "fill",
    "stroke",
    "clip-path",
    "mix-blend-mode",
    "-webkit-mask-image",
    "-webkit-mask-size",
    "-webkit-mask-position",
    "-webkit-mask-repeat",
  ];
  const ELEMENT_STYLE_KEYS = [...TYPOGRAPHY_STYLE_KEYS, ...SURFACE_STYLE_KEYS];
  const VECTOR_STYLE_KEYS = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-miterlimit",
    "fill-opacity",
    "stroke-opacity",
    "fill-rule",
    "clip-rule",
    "opacity",
    "color",
    "stop-color",
    "stop-opacity",
    "display",
    "visibility",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
    "letter-spacing",
    "mix-blend-mode",
    "filter",
  ];
  const VECTOR_FRAME_KEYS = [
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "vertical-align",
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "transform",
    "transform-origin",
    "flex-shrink",
    "flex-grow",
    "align-self",
    "order",
    "overflow",
  ];
  const PANEL_STYLE_KEYS = [
    "background-color",
    "background-image",
    "background-size",
    "background-position",
    "background-repeat",
    "background-origin",
    "background-clip",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
    "box-shadow",
    "backdrop-filter",
    "filter",
    "clip-path",
    "-webkit-mask-image",
    "-webkit-mask-size",
    "-webkit-mask-position",
    "-webkit-mask-repeat",
  ];
  function serializeAppearance(computedAppearance, props) {
    return props.reduce((serialized, propertyName) => {
      const propertyValue = computedAppearance.getPropertyValue(propertyName);
      return propertyValue === "" ? serialized : serialized + `${propertyName}:${propertyValue};`;
    }, "");
  }
  const resolveLineHeight = (computedAppearance) => {
    const record = parseFloat(computedAppearance.lineHeight);
    return isNaN(record) ? (parseFloat(computedAppearance.fontSize) || 16) * 1.2 : record;
  };
  function composedChildren(element) {
    if (element.shadowRoot) return Array.from(element.shadowRoot.childNodes);
    const assigned =
      element.localName === "slot"
        ? element.assignedNodes({
            flatten: true,
          })
        : [];
    return Array.from(assigned.length ? assigned : element.childNodes);
  }
  function materializePseudoElement(sourceElement, which) {
    const pseudoAppearance = getComputedStyle(sourceElement, which);
    const candidate = pseudoAppearance.content;
    if (!candidate || candidate === "none" || candidate === "normal" || pseudoAppearance.display === "none")
      return null;
    const pseudoNode = document.createElement("span");
    const rawText = candidate.match(/^"((?:[^"\\]|\\.)*)"/);
    if (rawText) pseudoNode.textContent = rawText[1].replace(/\\(.)/g, "$1");
    else if (/^url\(/.test(candidate)) {
      const segment = candidate.match(/^url\(\s*["']?([^"')]+)["']?\s*\)/);
      if (segment) {
        const imageNode = document.createElement("img");
        imageNode.src = segment[1];
        imageNode.setAttribute("style", "display:inline-block;vertical-align:middle;");
        pseudoNode.appendChild(imageNode);
      }
    }
    pseudoNode.setAttribute("style", serializeAppearance(pseudoAppearance, ELEMENT_STYLE_KEYS));
    return pseudoNode;
  }
  function attachPseudoElements(sourceElement, replicaElement) {
    const secondValue = materializePseudoElement(sourceElement, "::before");
    if (secondValue) replicaElement.insertBefore(secondValue, replicaElement.firstChild);
    const firstValue = materializePseudoElement(sourceElement, "::after");
    if (firstValue) replicaElement.appendChild(firstValue);
  }
  function sanitizeReplica(sourceElement, replicaElement) {
    const tag = sourceElement.localName;
    if (UNSAFE_CLONE_TAGS.has(tag)) {
      replicaElement.remove();
      return null;
    }
    const computedAppearance = getComputedStyle(sourceElement);
    if (computedAppearance.display === "none") {
      replicaElement.remove();
      return null;
    }
    const isSvg = sourceElement instanceof SVGElement;
    let screenSpace = serializeAppearance(computedAppearance, isSvg ? VECTOR_STYLE_KEYS : ELEMENT_STYLE_KEYS);
    if (isSvg && tag === "svg" && !sourceElement.ownerSVGElement) {
      replicaElement.setAttribute(
        "width",
        sourceElement.clientWidth || sourceElement.getBoundingClientRect().width,
      );
      replicaElement.setAttribute(
        "height",
        sourceElement.clientHeight || sourceElement.getBoundingClientRect().height,
      );
      screenSpace += serializeAppearance(computedAppearance, VECTOR_FRAME_KEYS);
    }
    replicaElement.setAttribute("style", screenSpace);
    for (const firstValue of [...replicaElement.attributes]) {
      const quantity = firstValue.name;
      if (
        quantity.startsWith("on") ||
        quantity === "contenteditable" ||
        quantity === "tabindex" ||
        quantity === "autofocus" ||
        quantity === "srcset" ||
        quantity === "sizes" ||
        quantity === "loading"
      )
        replicaElement.removeAttribute(quantity);
    }
    if (tag === "img") {
      replicaElement.setAttribute("src", resolveImageAddress(sourceElement));
      replicaElement.setAttribute("decoding", "async");
    }
    if (tag === "svg") embedVectorReferences(sourceElement, replicaElement);
    if (tag === "audio") {
      replicaElement.remove();
      return null;
    }
    if (tag === "video" || tag === "canvas" || (!isSvg && tag.includes("-"))) {
      let replacementNode;
      const videoAddress = tag === "video" ? resolveVideoAddress(sourceElement) : null;
      if (videoAddress) {
        replacementNode = document.createElement("video");
        for (const [slot, record] of [
          ["src", videoAddress],
          ["muted", ""],
          ["playsinline", ""],
          ["preload", "auto"],
        ])
          replacementNode.setAttribute(slot, record);
        if (!sourceElement.paused || sourceElement.autoplay) replacementNode.setAttribute("autoplay", "");
        if (sourceElement.loop || sourceElement.autoplay || !sourceElement.paused)
          replacementNode.setAttribute("loop", "");
        if (sourceElement.poster) replacementNode.setAttribute("poster", sourceElement.poster);
      } else if (tag === "video" || tag === "canvas") {
        let resourceAddress = tag === "video" ? sourceElement.poster : readCanvasPreview(sourceElement);
        replacementNode = document.createElement(resourceAddress ? "img" : "span");
        if (resourceAddress) replacementNode.setAttribute("src", resourceAddress);
        else screenSpace += "background:#1b1b1f;";
      } else {
        replacementNode = document.createElement("span");
        while (replicaElement.firstChild) replacementNode.appendChild(replicaElement.firstChild);
      }
      replacementNode.setAttribute("style", screenSpace);
      if (replicaElement.parentNode) replicaElement.replaceWith(replacementNode);
      replicaElement = replacementNode;
    }
    if (!isSvg && !EXTERNAL_CONTENT_TAGS.has(tag) && !EDITABLE_TAGS.has(tag) && tag !== "img")
      attachPseudoElements(sourceElement, replicaElement);
    return replicaElement;
  }
  let replicaDocument = null;
  const getReplicaDocument = () =>
    replicaDocument || (replicaDocument = document.implementation.createHTMLDocument(""));
  function copyStyledElement(sourceElement) {
    const replicaElement = getReplicaDocument().importNode(sourceElement, true);
    const firstValue = [...sourceElement.querySelectorAll("*")];
    const secondValue = [...replicaElement.querySelectorAll("*")];
    const root = sanitizeReplica(sourceElement, replicaElement) || document.createElement("span");
    for (let indexValue = 0; indexValue < firstValue.length && indexValue < secondValue.length; indexValue++)
      sanitizeReplica(firstValue[indexValue], secondValue[indexValue]);
    return root;
  }
  function copyStyledChildren(sourceElement, replicaElement) {
    const firstValue = sourceElement.querySelectorAll("*");
    const secondValue = replicaElement.querySelectorAll("*");
    for (let indexValue = 0; indexValue < firstValue.length && indexValue < secondValue.length; indexValue++)
      sanitizeReplica(firstValue[indexValue], secondValue[indexValue]);
  }
  function resolveImageAddress(imageElement) {
    let markup = imageElement.currentSrc || imageElement.src || "";
    const deferredAddress =
      imageElement.getAttribute("data-src") ||
      imageElement.getAttribute("data-lazy-src") ||
      imageElement.getAttribute("data-original");
    if (
      deferredAddress &&
      (!markup || markup.startsWith("data:") || !imageElement.complete || !imageElement.naturalWidth)
    ) {
      try {
        markup = new URL(deferredAddress, location.href).href;
      } catch (ignoredError) {}
    }
    return markup;
  }
  function embedVectorReferences(sourceElement, replicaElement) {
    for (const segment of replicaElement.querySelectorAll("use")) {
      const referenceAddress = segment.getAttribute("href") || segment.getAttribute("xlink:href");
      if (!referenceAddress || referenceAddress[0] !== "#") continue;
      const referencedElement = document.getElementById(referenceAddress.slice(1));
      if (!referencedElement) continue;
      const isSymbolElement = referencedElement.localName === "symbol";
      const alignmentGuide = document.createElementNS(VECTOR_NAMESPACE, isSymbolElement ? "svg" : "g");
      if (isSymbolElement) {
        for (const attributeValue of ["viewBox", "preserveAspectRatio"])
          if (referencedElement.getAttribute(attributeValue))
            alignmentGuide.setAttribute(attributeValue, referencedElement.getAttribute(attributeValue));
        alignmentGuide.setAttribute("width", segment.getAttribute("width") || "100%");
        alignmentGuide.setAttribute("height", segment.getAttribute("height") || "100%");
        alignmentGuide.setAttribute("x", segment.getAttribute("x") || 0);
        alignmentGuide.setAttribute("y", segment.getAttribute("y") || 0);
        alignmentGuide.setAttribute("overflow", "visible");
      } else if (segment.getAttribute("x") || segment.getAttribute("y")) {
        alignmentGuide.setAttribute(
          "transform",
          `translate(${segment.getAttribute("x") || 0} ${segment.getAttribute("y") || 0})`,
        );
      }
      const useNodes = segment.getAttribute("style");
      if (useNodes) alignmentGuide.setAttribute("style", useNodes);
      for (const childElement of referencedElement.childNodes) {
        if (childElement.nodeType !== 1) {
          alignmentGuide.appendChild(childElement.cloneNode(true));
          continue;
        }
        alignmentGuide.appendChild(copyStyledElement(childElement));
      }
      segment.replaceWith(alignmentGuide);
    }
    const html = replicaElement.outerHTML;
    const referencedIds = new Set();
    html.replace(/url\(\s*["']?#([^"')\s]+)["']?\s*\)/g, (ignoredError, identity) =>
      referencedIds.add(identity),
    );
    if (!referencedIds.size) return;
    let vectorDefinitions = null;
    for (const identity of referencedIds) {
      if (replicaElement.querySelector(`[id="${CSS.escape(identity)}"]`)) continue;
      const referencedElement = document.getElementById(identity);
      if (!referencedElement) continue;
      if (!vectorDefinitions) {
        vectorDefinitions = document.createElementNS(VECTOR_NAMESPACE, "defs");
        replicaElement.insertBefore(vectorDefinitions, replicaElement.firstChild);
      }
      vectorDefinitions.appendChild(referencedElement.cloneNode(true));
    }
  }
  function extractScreenshotRegion(screenshot, rectangle) {
    if (!screenshot || !screenshot.valid) return null;
    if (rectangle.height > innerHeight * 3 || rectangle.width > innerWidth * 2) return null;
    const visibleArea = overlapBounds(readEdges(rectangle), {
      l: 0,
      t: 0,
      r: innerWidth,
      b: innerHeight,
    });
    if (!visibleArea) return null;
    const slot = screenshot.scale;
    const candidate = document.createElement("canvas");
    candidate.width = Math.max(1, Math.round(rectangle.width * slot));
    candidate.height = Math.max(1, Math.round(rectangle.height * slot));
    const widthValue = (visibleArea.r - visibleArea.l) * slot;
    const heightValue = (visibleArea.b - visibleArea.t) * slot;
    candidate
      .getContext("2d")
      .drawImage(
        screenshot.img,
        visibleArea.l * slot,
        visibleArea.t * slot,
        widthValue,
        heightValue,
        (visibleArea.l - rectangle.left) * slot,
        (visibleArea.t - rectangle.top) * slot,
        widthValue,
        heightValue,
      );
    const fullRectangle =
      visibleArea.l <= rectangle.left + 1 &&
      visibleArea.t <= rectangle.top + 1 &&
      visibleArea.r >= rectangle.right - 1 &&
      visibleArea.b >= rectangle.bottom - 1;
    try {
      return candidate.toDataURL(fullRectangle ? "image/jpeg" : "image/webp", 0.9);
    } catch (ignoredError) {
      return null;
    }
  }
  function resolveVideoAddress(element) {
    const candidatesFound = [
      element.currentSrc,
      element.getAttribute("src"),
      element.getAttribute("data-src"),
    ];
    for (const markup of element.querySelectorAll("source"))
      candidatesFound.push(markup.getAttribute("src"), markup.getAttribute("data-src"));
    for (const candidate of candidatesFound) {
      if (!candidate || /^(blob|mediasource):/i.test(candidate)) continue;
      try {
        return new URL(candidate, location.href).href;
      } catch (ignoredError) {}
    }
    return null;
  }
  function readCanvasPreview(element) {
    try {
      const inspectionResult = document.createElement("canvas");
      inspectionResult.width = inspectionResult.height = 12;
      const alignmentGuide = inspectionResult.getContext("2d");
      alignmentGuide.drawImage(element, 0, 0, 12, 12);
      const nodeValue = alignmentGuide.getImageData(0, 0, 12, 12).data;
      let firstValue = 0;
      for (let indexValue = 3; indexValue < nodeValue.length; indexValue += 4)
        firstValue += nodeValue[indexValue];
      return firstValue > 0 ? element.toDataURL() : null;
    } catch (ignoredError) {
      return null;
    }
  }
  function hasVisibleSurface(screenSpace) {
    if (readColorOpacity(screenSpace.backgroundColor) > 0.02) return true;
    if (screenSpace.backgroundImage && screenSpace.backgroundImage !== "none") return true;
    if (screenSpace.boxShadow && screenSpace.boxShadow !== "none") return true;
    for (const markup of ["Top", "Right", "Bottom", "Left"]) {
      if (
        parseFloat(screenSpace["border" + markup + "Width"]) > 0 &&
        screenSpace["border" + markup + "Style"] !== "none" &&
        readColorOpacity(screenSpace["border" + markup + "Color"]) > 0.02
      )
        return true;
    }
    return false;
  }
  function colorsMatch(firstValue, secondValue) {
    return (firstValue || "").replace(/\s/g, "") === (secondValue || "").replace(/\s/g, "");
  }
  function inspectPageBackdrop() {
    const heightValue = document.documentElement;
    const secondValue = document.body;
    const htmlAppearance = getComputedStyle(heightValue);
    const bodyAppearance = secondValue ? getComputedStyle(secondValue) : null;
    const pick = (computedAppearance) => ({
      color: computedAppearance.backgroundColor,
      image: computedAppearance.backgroundImage,
      size: computedAppearance.backgroundSize,
      position: computedAppearance.backgroundPosition,
      repeat: computedAppearance.backgroundRepeat,
    });
    if (readColorOpacity(htmlAppearance.backgroundColor) > 0.01 || htmlAppearance.backgroundImage !== "none")
      return {
        ...pick(htmlAppearance),
        from: heightValue,
      };
    if (
      bodyAppearance &&
      (readColorOpacity(bodyAppearance.backgroundColor) > 0.01 || bodyAppearance.backgroundImage !== "none")
    )
      return {
        ...pick(bodyAppearance),
        from: secondValue,
      };
    const darkTheme =
      /dark/.test(htmlAppearance.colorScheme) && matchMedia("(prefers-color-scheme: dark)").matches;
    return {
      color: darkTheme ? "rgb(18, 18, 18)" : "rgb(255, 255, 255)",
      image: "none",
      from: null,
    };
  }
  /* Capture geometry, styled content and job dependencies before any robot starts.*/
  function collectPageBlueprint(scrollContext, screenshot) {
    const {
      ox: viewportOffsetX,
      oy: viewportOffsetY,
      sx: scrollPositionX,
      sy: scrollPositionY,
      vw: viewportWidth,
      vh: viewportHeight,
    } = scrollContext.geom();
    const documentWidth = Math.max(scrollContext.scrollWidth(), viewportWidth);
    const documentHeight = Math.min(
      Math.max(scrollContext.scrollHeight(), viewportHeight),
      DOCUMENT_HEIGHT_LIMIT,
    );
    const items = [];
    const roots = [];
    let order = 0;
    const computedStyleCache = new Map();
    const appearanceOf = (element) => {
      let candidate = computedStyleCache.get(element);
      if (!candidate) {
        candidate = getComputedStyle(element);
        computedStyleCache.set(element, candidate);
      }
      return candidate;
    };
    const inlineCache = new Map();
    const fullClip = {
      l: -1e9,
      t: -1e9,
      r: 1e9,
      b: 1e9,
    };
    const viewClip = {
      l: 0,
      t: 0,
      r: innerWidth,
      b: innerHeight,
    };
    const pageBg = scrollContext.pageBg;
    const floats = [];
    const bars = [];
    let portKey = null;
    const html = document.documentElement;
    const body = document.body;
    const toDocumentRectangle = (rectangle, layer) =>
      layer === "world"
        ? {
            x: rectangle.left - viewportOffsetX + scrollPositionX,
            y: rectangle.top - viewportOffsetY + scrollPositionY,
            w: rectangle.width,
            h: rectangle.height,
          }
        : {
            x: rectangle.left,
            y: rectangle.top,
            w: rectangle.width,
            h: rectangle.height,
          };
    const toDocumentClip = (candidate, layer) =>
      layer === "world"
        ? {
            l: candidate.l - viewportOffsetX + scrollPositionX,
            t: candidate.t - viewportOffsetY + scrollPositionY,
            r: candidate.r - viewportOffsetX + scrollPositionX,
            b: candidate.b - viewportOffsetY + scrollPositionY,
          }
        : {
            ...candidate,
          };
    const resolveClipFor = (rectangle, clip, layer) => {
      if (
        rectangle.left >= clip.l - 0.5 &&
        rectangle.top >= clip.t - 0.5 &&
        rectangle.right <= clip.r + 0.5 &&
        rectangle.bottom <= clip.b + 0.5
      )
        return null;
      return toDocumentClip(clip, layer);
    };
    const intersectsDocument = (secondValue, layer) =>
      layer === "world"
        ? secondValue.x + secondValue.w > 0 &&
          secondValue.x < documentWidth &&
          secondValue.y + secondValue.h > 0 &&
          secondValue.y < documentHeight
        : secondValue.x + secondValue.w > 0 &&
          secondValue.x < innerWidth &&
          secondValue.y + secondValue.h > 0 &&
          secondValue.y < innerHeight;
    function registerFragment(fragment) {
      fragment.id = items.length;
      fragment.revision = 1;
      fragment.paintedRevision = 0;
      fragment.isVisible = false;
      fragment.dx = 0;
      fragment.dy = 0;
      fragment.scale = 1;
      fragment.mode = "own";
      items.push(fragment);
      return fragment;
    }
    function containsOnlyInlineContent(element) {
      let record = inlineCache.get(element);
      if (record !== undefined) return record;
      record = !element.shadowRoot;
      if (record)
        for (const candidate of element.children) {
          const tag = candidate.localName;
          if (IGNORED_TAGS.has(tag) || tag === "br" || tag === "wbr") continue;
          if (candidate instanceof SVGElement) continue;
          const nodeValue = appearanceOf(candidate).display;
          if (nodeValue === "none") continue;
          if (nodeValue === "inline") {
            if (!containsOnlyInlineContent(candidate)) {
              record = false;
              break;
            }
          } else if (!nodeValue.startsWith("inline")) {
            record = false;
            break;
          }
        }
      inlineCache.set(element, record);
      return record;
    }
    function rootAppearance(computedAppearance, isRun) {
      let markup = serializeAppearance(computedAppearance, TYPOGRAPHY_STYLE_KEYS);
      if (computedAppearance.backgroundClip === "text") {
        markup += serializeAppearance(computedAppearance, [
          "background-image",
          "background-size",
          "background-position",
          "background-repeat",
          "background-clip",
          "-webkit-background-clip",
        ]);
        if (
          computedAppearance.webkitTextFillColor === "rgba(0, 0, 0, 0)" ||
          computedAppearance.webkitTextFillColor === "transparent"
        ) {
          markup +=
            "background-image:none !important;background-clip:border-box !important;-webkit-background-clip:border-box !important;color:#111 !important;-webkit-text-fill-color:#111 !important;";
        }
      }
      if (isRun)
        return (
          markup +
          "display:block;padding:0;margin:0;box-sizing:border-box;width:100%;height:100%;position:relative;"
        );
      const pad = (side) =>
        (parseFloat(computedAppearance.getPropertyValue(`padding-${side}`)) || 0) +
        (parseFloat(computedAppearance.getPropertyValue(`border-${side}-width`)) || 0);
      let nodeValue = computedAppearance.display;
      if (/flex/.test(nodeValue)) {
        nodeValue = "flex";
        markup += serializeAppearance(computedAppearance, [
          "flex-direction",
          "flex-wrap",
          "align-items",
          "justify-content",
          "align-content",
          "row-gap",
          "column-gap",
        ]);
      } else if (/grid/.test(nodeValue)) {
        nodeValue = "grid";
        markup += serializeAppearance(computedAppearance, [
          "grid-template-columns",
          "grid-template-rows",
          "grid-auto-flow",
          "grid-auto-columns",
          "grid-auto-rows",
          "align-items",
          "justify-items",
          "justify-content",
          "align-content",
          "row-gap",
          "column-gap",
        ]);
      } else if (nodeValue === "list-item" || nodeValue === "-webkit-box") {
      } else nodeValue = "block";
      markup += `display:${nodeValue};padding:${pad("top")}px ${pad("right")}px ${pad("bottom")}px ${pad("left")}px;`;
      if (
        computedAppearance.overflowX !== "visible" ||
        computedAppearance.overflowY !== "visible" ||
        computedAppearance.textOverflow === "ellipsis" ||
        (computedAppearance.webkitLineClamp && computedAppearance.webkitLineClamp !== "none")
      ) {
        markup += serializeAppearance(computedAppearance, [
          "overflow-x",
          "overflow-y",
          "text-overflow",
          "-webkit-line-clamp",
          "-webkit-box-orient",
        ]);
      }
      return markup + "margin:0;box-sizing:border-box;width:100%;height:100%;position:relative;";
    }
    function registerTextFragment(base, root, textRectangle, computedAppearance, layer, extra) {
      const fontSizeValue = parseFloat(computedAppearance.fontSize) || 16;
      const text = root.textContent.replace(/\s+/g, " ").trim();
      return registerFragment({
        kind: "text",
        ...base,
        textBounds: textRectangle,
        full: root,
        fs: fontSizeValue,
        lineHeightValue: resolveLineHeight(computedAppearance),
        align: computedAppearance.textAlign,
        text,
        sig: text,
        ...extra,
      });
    }
    function captureTextLeaf(element, computedAppearance, rectangle, drawingContext, key) {
      const root = document.createElement("div");
      root.setAttribute("style", rootAppearance(computedAppearance, false));
      const clone = getReplicaDocument().importNode(element, true);
      copyStyledChildren(element, clone);
      while (clone.firstChild) root.appendChild(clone.firstChild);
      attachPseudoElements(element, root);
      const textRange = document.createRange();
      textRange.selectNodeContents(element);
      const textMetrics = textRange.getBoundingClientRect();
      if (computedAppearance.display === "table-cell" && textMetrics.height)
        root.style.paddingTop = Math.max(0, textMetrics.top - rectangle.top) + "px";
      if (/^(block|list-item)$/.test(root.style.display)) {
        const quantity = (point) => parseFloat(computedAppearance.getPropertyValue(point)) || 0;
        const clipLeft = rectangle.left + quantity("border-left-width") + quantity("padding-left");
        const clipTop = rectangle.top + quantity("border-top-width") + quantity("padding-top");
        const clipRight = rectangle.right - quantity("border-right-width") - quantity("padding-right");
        for (const f of floats) {
          if (
            f.b <= rectangle.top + 1 ||
            f.t >= rectangle.bottom - 1 ||
            f.r <= rectangle.left + 1 ||
            f.l >= rectangle.right - 1
          )
            continue;
          if (f.el.contains(element)) continue;
          const floatSpacer = document.createElement("div");
          const top = Math.max(0, f.t - clipTop);
          const widthValue = f.side === "left" ? f.r - clipLeft : clipRight - f.l;
          if (widthValue <= 0) continue;
          floatSpacer.setAttribute(
            "style",
            `float:${f.side};clear:${f.side};width:${widthValue}px;height:${Math.max(0, f.b - Math.max(f.t, clipTop))}px;margin-top:${top}px;`,
          );
          root.insertBefore(floatSpacer, root.firstChild);
        }
      }
      const box = toDocumentRectangle(rectangle, drawingContext.layer);
      const textRectangle =
        textMetrics.width > 0 && textMetrics.height > 0
          ? toDocumentRectangle(textMetrics, drawingContext.layer)
          : {
              ...box,
            };
      textRectangle.x = limitRange(textRectangle.x, box.x - 4, box.x + box.w);
      textRectangle.y = limitRange(textRectangle.y, box.y - 4, box.y + box.h);
      registerTextFragment(
        {
          ...box,
          layer: drawingContext.layer,
          key,
          op: drawingContext.op,
          clip: resolveClipFor(rectangle, drawingContext.clip, drawingContext.layer),
          parentPanel: drawingContext.boxItem,
          blend:
            computedAppearance.mixBlendMode !== "normal"
              ? computedAppearance.mixBlendMode
              : drawingContext.blend || "",
        },
        root,
        textRectangle,
        computedAppearance,
        drawingContext.layer,
      );
    }
    function captureTextRun(element, computedAppearance, run, drawingContext) {
      const textRange = document.createRange();
      textRange.setStartBefore(run[0]);
      textRange.setEndAfter(run[run.length - 1]);
      const rectangle = textRange.getBoundingClientRect();
      if (rectangle.width < 1 || rectangle.height < 1) return;
      if (!overlapBounds(readEdges(rectangle), drawingContext.clip)) return;
      const root = document.createElement("div");
      root.setAttribute("style", rootAppearance(computedAppearance, true));
      const single = rectangle.height < resolveLineHeight(computedAppearance) * 1.6;
      if (single) root.style.whiteSpace = "nowrap";
      for (const quantity of run) {
        if (quantity.nodeType === 3) root.appendChild(document.createTextNode(quantity.data));
        else root.appendChild(copyStyledElement(quantity));
      }
      const box = toDocumentRectangle(rectangle, drawingContext.layer);
      if (!intersectsDocument(box, drawingContext.layer)) return;
      box.w += 1;
      const inspectionResult = document.createElement("div");
      inspectionResult.style.cssText = `all:initial;position:fixed;left:0;top:0;width:${box.w}px;height:${box.h}px;visibility:hidden;pointer-events:none;`;
      inspectionResult.appendChild(root);
      document.documentElement.appendChild(inspectionResult);
      const measure = document.createRange();
      measure.selectNodeContents(root);
      const offset = measure.getBoundingClientRect().top - root.getBoundingClientRect().top;
      root.style.top = -offset + "px";
      root.remove();
      inspectionResult.remove();
      registerTextFragment(
        {
          ...box,
          layer: drawingContext.layer,
          key: drawingContext.key(),
          op: drawingContext.op,
          clip: resolveClipFor(rectangle, drawingContext.clip, drawingContext.layer),
          parentPanel: drawingContext.boxItem,
          blend: drawingContext.blend || "",
        },
        root,
        {
          ...box,
        },
        computedAppearance,
        drawingContext.layer,
      );
    }
    function registerVectorFragment(pts, stroke, sw, dash, drawingContext, key) {
      const xs = pts.map((point) => point.x);
      const ys = pts.map((point) => point.y);
      return registerFragment({
        kind: "line",
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
        pts,
        stroke,
        sw,
        dash,
        placed: 0,
        shut: false,
        edit: false,
        owner: null,
        layer: drawingContext.layer,
        key,
        op: drawingContext.op,
        clip: null,
        parentPanel: drawingContext.boxItem,
        sig: pts.length + stroke,
      });
    }
    function capturePanelFragment(element, computedAppearance, rectangle, drawingContext, key, forceRect) {
      if (element === html) return null;
      const tag = element.localName;
      const backgroundColorValue = computedAppearance.backgroundColor;
      const backgroundImageValue = computedAppearance.backgroundImage;
      const bgVisible =
        (readColorOpacity(backgroundColorValue) > 0.01 &&
          (!colorsMatch(backgroundColorValue, pageBg.color) || !!drawingContext.boxItem)) ||
        backgroundImageValue !== "none";
      if (element === body && pageBg.from === body) return null;
      const sides = ["top", "right", "bottom", "left"].map((markup) => {
        const widthValue = parseFloat(computedAppearance.getPropertyValue(`border-${markup}-width`)) || 0;
        const screenSpace = computedAppearance.getPropertyValue(`border-${markup}-style`);
        const candidate = computedAppearance.getPropertyValue(`border-${markup}-color`);
        return widthValue > 0 &&
          screenSpace !== "none" &&
          screenSpace !== "hidden" &&
          readColorOpacity(candidate) > 0.02
          ? {
              s: markup,
              w: widthValue,
              st: screenSpace,
              c: candidate,
            }
          : null;
      });
      const numericBorder = sides.filter(Boolean).length;
      const shadow = computedAppearance.boxShadow && computedAppearance.boxShadow !== "none";
      const backdrop = computedAppearance.backdropFilter && computedAppearance.backdropFilter !== "none";
      const secondValue = toDocumentRectangle(rectangle, drawingContext.layer);
      if (tag === "hr") {
        const candidate = sides[0]
          ? sides[0].c
          : readColorOpacity(backgroundColorValue) > 0.01
            ? backgroundColorValue
            : "rgb(200,200,200)";
        const y = secondValue.y + secondValue.h / 2;
        registerVectorFragment(
          [
            {
              x: secondValue.x,
              y,
            },
            {
              x: secondValue.x + secondValue.w,
              y,
            },
          ],
          candidate,
          Math.max(1, Math.min(secondValue.h, 2)),
          null,
          drawingContext,
          key,
        );
        return null;
      }
      const sameAsPage =
        readColorOpacity(backgroundColorValue) > 0.01 &&
        colorsMatch(backgroundColorValue, pageBg.color) &&
        backgroundImageValue === "none";
      if (!forceRect && !bgVisible && !shadow && !backdrop) {
        if (numericBorder === 0) return null;
        if (numericBorder < 4) {
          for (const surfaceDescriptor of sides) {
            if (!surfaceDescriptor) continue;
            const halfStroke = surfaceDescriptor.w / 2;
            let pts;
            if (surfaceDescriptor.s === "top")
              pts = [
                {
                  x: secondValue.x,
                  y: secondValue.y + halfStroke,
                },
                {
                  x: secondValue.x + secondValue.w,
                  y: secondValue.y + halfStroke,
                },
              ];
            else if (surfaceDescriptor.s === "bottom")
              pts = [
                {
                  x: secondValue.x,
                  y: secondValue.y + secondValue.h - halfStroke,
                },
                {
                  x: secondValue.x + secondValue.w,
                  y: secondValue.y + secondValue.h - halfStroke,
                },
              ];
            else if (surfaceDescriptor.s === "left")
              pts = [
                {
                  x: secondValue.x + halfStroke,
                  y: secondValue.y,
                },
                {
                  x: secondValue.x + halfStroke,
                  y: secondValue.y + secondValue.h,
                },
              ];
            else
              pts = [
                {
                  x: secondValue.x + secondValue.w - halfStroke,
                  y: secondValue.y,
                },
                {
                  x: secondValue.x + secondValue.w - halfStroke,
                  y: secondValue.y + secondValue.h,
                },
              ];
            const dash =
              surfaceDescriptor.st === "dashed"
                ? `${surfaceDescriptor.w * 3} ${surfaceDescriptor.w * 2}`
                : surfaceDescriptor.st === "dotted"
                  ? `${surfaceDescriptor.w} ${surfaceDescriptor.w * 1.5}`
                  : null;
            registerVectorFragment(pts, surfaceDescriptor.c, surfaceDescriptor.w, dash, drawingContext, key);
          }
          return null;
        }
      }
      if (sameAsPage && !drawingContext.boxItem && numericBorder === 0 && !shadow && !backdrop && !forceRect)
        return null;
      const cssText = serializeAppearance(computedAppearance, PANEL_STYLE_KEYS);
      return registerFragment({
        kind: "rect",
        blend:
          computedAppearance.mixBlendMode !== "normal"
            ? computedAppearance.mixBlendMode
            : drawingContext.blend || "",
        big: secondValue.w * secondValue.h > viewportWidth * viewportHeight * 0.4,
        ...secondValue,
        css: cssText,
        radius: computedAppearance.borderRadius,
        draw: null,
        styled: false,
        layer: drawingContext.layer,
        key,
        op: drawingContext.op,
        clip: resolveClipFor(rectangle, drawingContext.clip, drawingContext.layer),
        parentPanel: drawingContext.boxItem,
        sig: cssText,
      });
    }
    const PSEUDO_NODE_SENTINEL = {
      localName: "pseudo",
    };
    function capturePseudoPanel(element, computedAppearance, rectangle, drawingContext, which, empty) {
      const pseudoAppearance = getComputedStyle(element, which);
      const candidate = pseudoAppearance.content;
      if (
        !candidate ||
        candidate === "none" ||
        candidate === "normal" ||
        pseudoAppearance.display === "none" ||
        pseudoAppearance.visibility !== "visible"
      )
        return;
      const pop = parseFloat(pseudoAppearance.opacity);
      if (!(pop > 0.03)) return;
      const quantity = (record) => parseFloat(record) || 0;
      const widthValue = parseFloat(pseudoAppearance.width);
      const heightValue = parseFloat(pseudoAppearance.height);
      if (!(widthValue > 0 && heightValue > 0)) return;
      const pad = {
        l: rectangle.left + quantity(computedAppearance.borderLeftWidth),
        t: rectangle.top + quantity(computedAppearance.borderTopWidth),
        r: rectangle.right - quantity(computedAppearance.borderRightWidth),
        b: rectangle.bottom - quantity(computedAppearance.borderBottomWidth),
      };
      let glyphLeft;
      let glyphTop;
      if (pseudoAppearance.position === "absolute") {
        if (computedAppearance.position === "static") return;
        const borderWidth =
          widthValue +
          quantity(pseudoAppearance.paddingLeft) +
          quantity(pseudoAppearance.paddingRight) +
          quantity(pseudoAppearance.borderLeftWidth) +
          quantity(pseudoAppearance.borderRightWidth);
        const borderHeight =
          heightValue +
          quantity(pseudoAppearance.paddingTop) +
          quantity(pseudoAppearance.paddingBottom) +
          quantity(pseudoAppearance.borderTopWidth) +
          quantity(pseudoAppearance.borderBottomWidth);
        glyphLeft =
          pseudoAppearance.left !== "auto"
            ? pad.l + quantity(pseudoAppearance.left)
            : pseudoAppearance.right !== "auto"
              ? pad.r - quantity(pseudoAppearance.right) - borderWidth
              : pad.l;
        glyphTop =
          pseudoAppearance.top !== "auto"
            ? pad.t + quantity(pseudoAppearance.top)
            : pseudoAppearance.bottom !== "auto"
              ? pad.b - quantity(pseudoAppearance.bottom) - borderHeight
              : pad.t;
        const entry = pseudoAppearance.transform.match(/^matrix\(([^)]+)\)$/);
        if (entry) {
          const slot = entry[1].split(",").map(Number);
          glyphLeft += slot[4];
          glyphTop += slot[5];
        }
        const fake = {
          left: glyphLeft,
          top: glyphTop,
          right: glyphLeft + borderWidth,
          bottom: glyphTop + borderHeight,
          width: borderWidth,
          height: borderHeight,
        };
        if (!overlapBounds(readEdges(fake), drawingContext.clip)) return;
        capturePanelFragment(
          PSEUDO_NODE_SENTINEL,
          pseudoAppearance,
          fake,
          {
            ...drawingContext,
            op: drawingContext.op * pop,
          },
          drawingContext.key(),
          false,
        );
      } else {
        const clipLeft = pad.l + quantity(computedAppearance.paddingLeft);
        const clipTop = pad.t + quantity(computedAppearance.paddingTop);
        const contentWidth = pad.r - quantity(computedAppearance.paddingRight) - clipLeft;
        const childElement = pad.b - quantity(computedAppearance.paddingBottom) - clipTop;
        const align =
          (pseudoAppearance.alignSelf !== "auto"
            ? pseudoAppearance.alignSelf
            : computedAppearance.alignItems) || "";
        const vAlign = () =>
          /center/.test(align)
            ? clipTop + (childElement - heightValue) / 2
            : /end/.test(align)
              ? clipTop + childElement - heightValue
              : clipTop;
        if (empty) {
          glyphLeft = clipLeft + Math.max(0, (contentWidth - widthValue) / 2);
          glyphTop = clipTop + Math.max(0, (childElement - heightValue) / 2);
        } else if (/flex/.test(computedAppearance.display) && /^row/.test(computedAppearance.flexDirection)) {
          const kidsR = [...element.children]
            .filter(
              (slot) =>
                appearanceOf(slot).display !== "none" &&
                appearanceOf(slot).position !== "absolute" &&
                appearanceOf(slot).position !== "fixed",
            )
            .map((slot) => slot.getBoundingClientRect())
            .filter((slot) => slot.width || slot.height);
          if (!kidsR.length) return;
          const gap = quantity(computedAppearance.columnGap);
          if (which === "::after")
            glyphLeft = kidsR[kidsR.length - 1].right + gap + quantity(pseudoAppearance.marginLeft);
          else glyphLeft = kidsR[0].left - gap - quantity(pseudoAppearance.marginRight) - widthValue;
          glyphTop = vAlign();
        } else return;
        const fake = {
          left: glyphLeft,
          top: glyphTop,
          right: glyphLeft + widthValue,
          bottom: glyphTop + heightValue,
          width: widthValue,
          height: heightValue,
        };
        if (!overlapBounds(readEdges(fake), drawingContext.clip)) return;
        capturePanelFragment(
          PSEUDO_NODE_SENTINEL,
          pseudoAppearance,
          fake,
          {
            ...drawingContext,
            op: drawingContext.op * pop,
          },
          drawingContext.key(),
          false,
        );
      }
    }
    function createMediaReplica(element, computedAppearance, rectangle) {
      const tag = element.localName;
      const fit = `object-fit:${computedAppearance.objectFit};object-position:${computedAppearance.objectPosition};`;
      if (tag === "canvas") {
        const entry = document.createElement("canvas");
        entry.width = element.width;
        entry.height = element.height;
        entry.setAttribute(
          "style",
          fit + `display:block;width:100%;height:100%;filter:${computedAppearance.filter};`,
        );
        return {
          el: entry,
          sig: element,
          sourceCanvas: element,
        };
      }
      if (tag === "img") {
        const sourceElement = resolveImageAddress(element);
        if (!sourceElement) return null;
        const entry = document.createElement("img");
        entry.referrerPolicy = element.referrerPolicy;
        if (element.crossOrigin != null) entry.crossOrigin = element.crossOrigin;
        entry.src = sourceElement;
        entry.decoding = "async";
        entry.setAttribute("style", fit + "display:block;");
        entry.draggable = false;
        return {
          el: entry,
          sig: sourceElement,
        };
      }
      if (tag === "svg") {
        const entry = copyStyledElement(element);
        entry.setAttribute("width", "100%");
        entry.setAttribute("height", "100%");
        entry.style.display = "block";
        entry.style.overflow = "visible";
        entry.style.margin = "0";
        entry.style.position = "static";
        const mt = computedAppearance.transform.match(/^matrix\(([^)]+)\)$/);
        const slot = mt ? mt[1].split(",").map(Number) : null;
        entry.style.transform =
          slot &&
          Math.abs(Math.hypot(slot[0], slot[1]) - 1) < 0.02 &&
          Math.abs(Math.hypot(slot[2], slot[3]) - 1) < 0.02
            ? `matrix(${slot[0]},${slot[1]},${slot[2]},${slot[3]},0,0)`
            : "none";
        entry.style.transformOrigin = "50% 50%";
        const heightValue = entry.outerHTML;
        return {
          el: entry,
          sig: heightValue.length + ":" + heightValue.slice(0, 160),
        };
      }
      const imgOf = (sourceElement, extra) => {
        const entry = document.createElement("img");
        entry.src = sourceElement;
        entry.setAttribute("style", (extra || "") + "display:block;width:100%;height:100%;");
        entry.draggable = false;
        return {
          el: entry,
          sig: sourceElement.slice(0, 120) + sourceElement.length,
        };
      };
      if (tag === "iframe" || tag === "embed" || tag === "object") {
        const crop = extractScreenshotRegion(screenshot, rectangle);
        if (crop) return imgOf(crop);
      }
      if (tag === "video") {
        const entry = document.createElement("canvas");
        entry.width = element.videoWidth || element.clientWidth || 1;
        entry.height = element.videoHeight || element.clientHeight || 1;
        entry.setAttribute(
          "style",
          fit + `display:block;width:100%;height:100%;filter:${computedAppearance.filter};`,
        );
        return {
          el: entry,
          sig: element,
          sourceVideo: element,
        };
      }
      const nodeValue = document.createElement("div");
      let host = "";
      try {
        host = new URL(element.src || element.data || "", location.href).hostname.replace(/^www\./, "");
      } catch (ignoredError) {}
      nodeValue.setAttribute(
        "style",
        "background:#F1F2F4;display:flex;align-items:center;justify-content:center;font:500 12px/1.2 system-ui,sans-serif;color:#8A8F98;letter-spacing:.01em;",
      );
      nodeValue.textContent = host || "embed";
      return {
        el: nodeValue,
        sig: "frame:" + host,
      };
    }
    function captureMediaFragment(element, computedAppearance, rectangle, drawingContext, key) {
      let sourceElement = element;
      let sourceAppearance = computedAppearance;
      if (element.localName === "picture") {
        sourceElement = element.querySelector("img");
        if (!sourceElement) return;
        sourceAppearance = appearanceOf(sourceElement);
      }
      const entry = createMediaReplica(sourceElement, sourceAppearance, rectangle);
      if (!entry) return;
      const secondValue = toDocumentRectangle(rectangle, drawingContext.layer);
      registerFragment({
        kind: "image",
        ...secondValue,
        blend:
          computedAppearance.mixBlendMode !== "normal"
            ? computedAppearance.mixBlendMode
            : drawingContext.blend || "",
        media: entry.el,
        sourceCanvas: entry.sourceCanvas,
        sourceVideo: entry.sourceVideo,
        animated:
          sourceElement.localName === "canvas" ||
          sourceElement.localName === "video" ||
          sourceElement
            .getAnimations({
              subtree: true,
            })
            .some((firstValue) => firstValue.playState === "running"),
        frameStyle: serializeAppearance(computedAppearance, [
          "border-top-width",
          "border-right-width",
          "border-bottom-width",
          "border-left-width",
          "border-top-style",
          "border-right-style",
          "border-bottom-style",
          "border-left-style",
          "border-top-color",
          "border-right-color",
          "border-bottom-color",
          "border-left-color",
        ]),
        radius: computedAppearance.borderRadius,
        shadow: computedAppearance.boxShadow !== "none" ? computedAppearance.boxShadow : "",
        bg:
          readColorOpacity(computedAppearance.backgroundColor) > 0.01
            ? computedAppearance.backgroundColor
            : "",
        draw: null,
        styled: false,
        layer: drawingContext.layer,
        key,
        op: drawingContext.op,
        clip: resolveClipFor(rectangle, drawingContext.clip, drawingContext.layer),
        parentPanel: drawingContext.boxItem,
        sig: entry.sig,
      });
    }
    function captureControlFragment(element, computedAppearance, rectangle, drawingContext, key) {
      const tag = element.localName;
      const type = (element.getAttribute("type") || "").toLowerCase();
      if (type === "hidden") return;
      const secondValue = toDocumentRectangle(rectangle, drawingContext.layer);
      if (tag === "input" && (type === "checkbox" || type === "radio")) {
        const accent =
          computedAppearance.accentColor && computedAppearance.accentColor !== "auto"
            ? computedAppearance.accentColor
            : "#0B6CFF";
        const markup = document.createElementNS(VECTOR_NAMESPACE, "svg");
        markup.setAttribute("viewBox", "0 0 16 16");
        markup.setAttribute("width", "100%");
        markup.setAttribute("height", "100%");
        const on = element.checked;
        markup.innerHTML =
          type === "radio"
            ? `<circle cx="8" cy="8" r="7" fill="#fff" stroke="${on ? accent : "#767676"}" stroke-width="1.2"/>${on ? `<circle cx="8" cy="8" r="4" fill="${accent}"/>` : ""}`
            : `<rect x="1" y="1" width="14" height="14" rx="2.5" fill="${on ? accent : "#fff"}" stroke="${on ? accent : "#767676"}" stroke-width="1.2"/>${on ? '<path d="M4.2 8.3 L7 11 L12 5.4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' : ""}`;
        registerFragment({
          kind: "image",
          ...secondValue,
          media: markup,
          frameStyle: "",
          radius: "0px",
          shadow: "",
          bg: "",
          draw: null,
          styled: false,
          layer: drawingContext.layer,
          key,
          op: drawingContext.op,
          clip: null,
          parentPanel: drawingContext.boxItem,
          sig: type + on,
        });
        return;
      }
      const boxIt = capturePanelFragment(element, computedAppearance, rectangle, drawingContext, key, false);
      let text = "";
      let controlPlaceholder = false;
      if (tag === "select")
        text =
          (element.selectedOptions && element.selectedOptions[0] && element.selectedOptions[0].text) || "";
      else if (["submit", "button", "reset"].includes(type))
        text = element.value || (type === "submit" ? "Submit" : type === "reset" ? "Reset" : "");
      else if (type === "password") text = "•".repeat((element.value || "").length);
      else if (["range", "color", "file", "image"].includes(type)) text = "";
      else text = element.value || "";
      if (!text && element.placeholder) {
        text = element.placeholder;
        controlPlaceholder = true;
      }
      if (!text.trim()) return;
      const root = document.createElement("div");
      const pad = (side) =>
        (parseFloat(computedAppearance.getPropertyValue(`padding-${side}`)) || 0) +
        (parseFloat(computedAppearance.getPropertyValue(`border-${side}-width`)) || 0);
      const isButton = ["submit", "button", "reset"].includes(type);
      let screenSpace = serializeAppearance(computedAppearance, TYPOGRAPHY_STYLE_KEYS);
      screenSpace += `padding:${pad("top")}px ${pad("right")}px ${pad("bottom")}px ${pad("left")}px;margin:0;box-sizing:border-box;width:100%;height:100%;overflow:hidden;`;
      screenSpace +=
        tag === "textarea"
          ? "display:block;white-space:pre-wrap;"
          : `display:flex;align-items:center;white-space:pre;${isButton ? "justify-content:center;" : ""}`;
      if (controlPlaceholder)
        screenSpace += `color:${getComputedStyle(element, "::placeholder").color};-webkit-text-fill-color:currentColor;`;
      root.setAttribute("style", screenSpace);
      root.textContent = text;
      registerTextFragment(
        {
          ...secondValue,
          layer: drawingContext.layer,
          key: key + 0.5,
          op: drawingContext.op,
          clip: resolveClipFor(rectangle, drawingContext.clip, drawingContext.layer),
          parentPanel: boxIt || drawingContext.boxItem,
        },
        root,
        {
          ...secondValue,
        },
        computedAppearance,
        drawingContext.layer,
      );
    }
    function visitElementTree(element, drawingContext, parent) {
      if (items.length >= FRAGMENT_LIMIT) return;
      const tag = element.localName;
      if (IGNORED_TAGS.has(tag) || element === scrollContext.host) return;
      const computedAppearance = appearanceOf(element);
      const displayMode = computedAppearance.display;
      if (displayMode === "none") return;
      if (displayMode === "contents") {
        let run = [];
        const flushRun = () => {
          if (drawingContext.key && run.some((quantity) => /\S/.test(quantity.data)))
            captureTextRun(element, computedAppearance, run, drawingContext);
          run = [];
        };
        for (const candidate of composedChildren(element)) {
          if (candidate.nodeType === 3) run.push(candidate);
          else if (candidate.nodeType === 1) {
            flushRun();
            visitElementTree(candidate, drawingContext, parent);
          }
        }
        flushRun();
        return;
      }
      const op = drawingContext.op * parseFloat(computedAppearance.opacity);
      if (!(op > 0.03)) return;
      const rectangle = element.getBoundingClientRect();
      const clipsSelf =
        element !== html &&
        element !== body &&
        element !== scrollContext.scroller &&
        computedAppearance.overflowX !== "visible" &&
        computedAppearance.overflowY !== "visible";
      if (clipsSelf && (rectangle.width <= 2 || rectangle.height <= 2)) return;
      if (
        computedAppearance.position === "absolute" &&
        /rect\(0px,? 0px,? 0px,? 0px\)/.test(computedAppearance.clip)
      )
        return;
      if (/inset\(50%\)|circle\(0px/.test(computedAppearance.clipPath)) return;
      if (computedAppearance.float !== "none" && rectangle.width > 1 && rectangle.height > 1) {
        const quantity = (point) => parseFloat(computedAppearance.getPropertyValue(point)) || 0;
        floats.push({
          el: element,
          side: computedAppearance.float,
          l: rectangle.left - quantity("margin-left"),
          t: rectangle.top - quantity("margin-top"),
          r: rectangle.right + quantity("margin-right"),
          b: rectangle.bottom + quantity("margin-bottom"),
        });
      }
      let layer = drawingContext.layer;
      let clip = drawingContext.clip;
      let zTop = drawingContext.zTop;
      let hasPositionedAncestor = drawingContext.posd;
      const pos = computedAppearance.position;
      if (pos === "fixed" && layer !== "over") {
        layer = "over";
        clip = viewClip;
      } else if (pos === "sticky" && layer === "world") {
        const top = parseFloat(computedAppearance.top);
        if (
          !isNaN(top) &&
          Math.abs(rectangle.top - viewportOffsetY - top) < 2 &&
          rectangle.height < viewportHeight * 0.4
        ) {
          layer = "over";
          clip = viewClip;
        }
      }
      const pointerBehavior = element.parentElement;
      const flexItem =
        pos === "static" && pointerBehavior && /flex|grid/.test(appearanceOf(pointerBehavior).display);
      if (pos !== "static" || flexItem) {
        if (computedAppearance.zIndex !== "auto") {
          if (zTop == null) zTop = parseInt(computedAppearance.zIndex, 10) || 0;
        } else if (pos !== "static") hasPositionedAncestor = true;
      }
      const nextStackingOrder = () => (zTop || 0) * 1e7 + (hasPositionedAncestor ? 5e6 : 0) + order++;
      if (
        layer === "over" &&
        drawingContext.layer !== "over" &&
        rectangle.top <= 4 &&
        rectangle.width >= viewportWidth * 0.8 &&
        rectangle.height > 20 &&
        rectangle.height <= 200
      ) {
        bars.push({
          node: null,
          r: rectangle,
          start: items.length,
          key: (zTop || 0) * 1e7 + (hasPositionedAncestor ? 5e6 : 0) + order - 0.5,
        });
      }
      const isScroller = !scrollContext.isRoot && element === scrollContext.scroller;
      const kidLayer = isScroller ? "world" : layer;
      const box = toDocumentRectangle(rectangle, layer);
      const visible = computedAppearance.visibility === "visible";
      const sized = rectangle.width >= 1 && rectangle.height >= 1;
      const emit =
        visible && sized && !!overlapBounds(readEdges(rectangle), clip) && intersectsDocument(box, layer);
      const node = {
        el: element,
        tag,
        cls: (element.getAttribute && element.getAttribute("class")) || "",
        layer,
        start: items.length,
        end: items.length,
        kids: [],
        box,
      };
      (parent ? parent.kids : roots).push(node);
      if (EXTERNAL_CONTENT_TAGS.has(tag) || EDITABLE_TAGS.has(tag)) {
        if (emit) {
          if (EDITABLE_TAGS.has(tag))
            captureControlFragment(
              element,
              computedAppearance,
              rectangle,
              {
                ...drawingContext,
                layer,
                clip,
                op,
              },
              nextStackingOrder(),
            );
          else
            captureMediaFragment(
              element,
              computedAppearance,
              rectangle,
              {
                ...drawingContext,
                layer,
                clip,
                op,
              },
              nextStackingOrder(),
            );
        }
        node.end = items.length;
        return;
      }
      let boxItem = drawingContext.boxItem;
      if (emit) {
        const secondValue = capturePanelFragment(
          element,
          computedAppearance,
          rectangle,
          {
            ...drawingContext,
            layer,
            clip,
            op,
          },
          nextStackingOrder(),
          false,
        );
        if (secondValue) boxItem = secondValue;
      }
      let kidClip = clip;
      if (isScroller) {
        kidClip = fullClip;
        portKey = nextStackingOrder();
      } else if (
        element !== html &&
        element !== body &&
        (computedAppearance.overflowX !== "visible" || computedAppearance.overflowY !== "visible")
      ) {
        const borderLeftValue = parseFloat(computedAppearance.borderLeftWidth) || 0;
        const bottomEdge = parseFloat(computedAppearance.borderTopWidth) || 0;
        const borderRightValue = parseFloat(computedAppearance.borderRightWidth) || 0;
        const borderBottomValue = parseFloat(computedAppearance.borderBottomWidth) || 0;
        kidClip = overlapBounds(clip, {
          l: rectangle.left + borderLeftValue,
          t: rectangle.top + bottomEdge,
          r: rectangle.right - borderRightValue,
          b: rectangle.bottom - borderBottomValue,
        });
        if (!kidClip) {
          node.end = items.length;
          return;
        }
      }
      const blend =
        computedAppearance.mixBlendMode !== "normal" ? computedAppearance.mixBlendMode : drawingContext.blend;
      const childContext = {
        op,
        layer: kidLayer,
        clip: kidClip,
        zTop,
        posd: hasPositionedAncestor,
        boxItem,
        key: nextStackingOrder,
        blend,
      };
      if (computedAppearance.contentVisibility === "hidden") {
        node.end = items.length;
        return;
      }
      let kids = composedChildren(element);
      if (tag === "details" && !element.open) {
        const sum = kids.find((quantity) => quantity.nodeType === 1 && quantity.localName === "summary");
        kids = sum ? [sum] : [];
      }
      const emptyEl = !kids.some(
        (slot) => (slot.nodeType === 3 && /\S/.test(slot.data)) || slot.nodeType === 1,
      );
      const pseudoContext = {
        ...childContext,
        layer,
        clip,
      };
      const directText = kids.some((quantity) => quantity.nodeType === 3 && /\S/.test(quantity.data));
      const kinds = [];
      let allRun = !element.shadowRoot;
      let anyText = directText;
      for (const quantity of kids) {
        if (quantity.nodeType === 3) {
          kinds.push(1);
          continue;
        }
        if (quantity.nodeType !== 1 || IGNORED_TAGS.has(quantity.localName)) {
          kinds.push(0);
          continue;
        }
        const nodeValue = appearanceOf(quantity).display;
        if (nodeValue === "none") {
          kinds.push(0);
          continue;
        }
        let inlineStyle = false;
        const textNode = quantity.localName;
        if (quantity.shadowRoot || textNode === "slot") inlineStyle = false;
        else if (textNode === "br" || textNode === "wbr") inlineStyle = true;
        else if (nodeValue === "inline") inlineStyle = containsOnlyInlineContent(quantity);
        else if (directText && nodeValue.startsWith("inline")) inlineStyle = true;
        if (inlineStyle && !anyText && /\S/.test(quantity.textContent)) anyText = true;
        kinds.push(inlineStyle ? 1 : 2);
        if (!inlineStyle) allRun = false;
      }
      if (allRun && anyText && !isScroller) {
        if (visible && sized && emit)
          captureTextLeaf(
            element,
            computedAppearance,
            rectangle,
            {
              ...childContext,
              layer,
            },
            nextStackingOrder(),
          );
        node.end = items.length;
        return;
      }
      if (emit && visible)
        capturePseudoPanel(element, computedAppearance, rectangle, pseudoContext, "::before", emptyEl);
      const afterPseudo = () => {
        if (emit && visible)
          capturePseudoPanel(element, computedAppearance, rectangle, pseudoContext, "::after", emptyEl);
      };
      let run = [];
      const flush = () => {
        if (!run.length) return;
        const hasText = run.some((quantity) =>
          quantity.nodeType === 3 ? /\S/.test(quantity.data) : /\S/.test(quantity.textContent),
        );
        if (hasText) {
          if (visible) captureTextRun(element, computedAppearance, run, childContext);
        } else {
          for (const quantity of run)
            if (quantity.nodeType === 1) visitElementTree(quantity, childContext, node);
        }
        run = [];
      };
      kids.forEach((quantity, indexValue) => {
        if (kinds[indexValue] === 1) run.push(quantity);
        else if (kinds[indexValue] === 2) {
          flush();
          visitElementTree(quantity, childContext, node);
        }
      });
      flush();
      afterPseudo();
      node.end = items.length;
    }
    const documentLayer = scrollContext.isRoot ? "world" : "under";
    const documentClip = scrollContext.isRoot ? fullClip : viewClip;
    visitElementTree(
      html,
      {
        op: 1,
        layer: documentLayer,
        clip: documentClip,
        zTop: null,
        posd: false,
        boxItem: null,
      },
      null,
    );
    const groups = [];
    const fragmentSignature = (quantity) => {
      let markup = "";
      for (let indexValue = quantity.start; indexValue < quantity.end; indexValue++)
        markup += items[indexValue].kind[0];
      return markup;
    };
    const componentsMatch = (firstValue, secondValue, loose) =>
      firstValue.w > 0 &&
      secondValue.w > 0 &&
      firstValue.h > 0 &&
      secondValue.h > 0 &&
      firstValue.h / secondValue.h < 1.8 &&
      secondValue.h / firstValue.h < 1.8 &&
      (loose || (firstValue.w / secondValue.w < 1.6 && secondValue.w / firstValue.w < 1.6));
    function locateRepeatedComponents(node, inCopy) {
      if (inCopy) return;
      const buckets = new Map();
      for (const slot of node.kids) {
        const quantity = slot.end - slot.start;
        if (quantity < 1 || quantity > 48) continue;
        if (items.slice(slot.start, slot.end).some((fragment) => fragment.animated)) continue;
        if (quantity === 1 && items[slot.start].kind === "text" && items[slot.start].text.length > 40)
          continue;
        const sig = `${slot.tag}|${slot.cls}|${slot.layer}|${fragmentSignature(slot)}`;
        if (!buckets.has(sig)) buckets.set(sig, []);
        buckets.get(sig).push(slot);
      }
      const copies = new Set();
      for (const list of buckets.values()) {
        if (list.length < 2) continue;
        const entry = list[0];
        const loose = entry.end - entry.start === 1 && items[entry.start].kind === "text";
        const members = list.filter((slot) => componentsMatch(slot.box, entry.box, loose));
        if (members.length < 2) continue;
        const alignmentGuide = {
          id: groups.length,
          master: members[0],
          copies: members.slice(1),
        };
        groups.push(alignmentGuide);
        for (const candidate of alignmentGuide.copies) copies.add(candidate);
      }
      for (const slot of node.kids) locateRepeatedComponents(slot, copies.has(slot));
    }
    for (const rectangle of roots) locateRepeatedComponents(rectangle, false);
    for (const alignmentGuide of groups) {
      for (const candidate of alignmentGuide.copies) {
        for (let indexValue = candidate.start; indexValue < candidate.end; indexValue++) {
          const fragment = items[indexValue];
          if (fragment.templateFragment) continue;
          fragment.templateFragment = items[alignmentGuide.master.start + (indexValue - candidate.start)];
          fragment.group = alignmentGuide;
        }
      }
    }
    const textTwinRegistry = new Map();
    for (const fragment of items) {
      if (fragment.kind !== "text" || fragment.templateFragment || !fragment.text) continue;
      const slot = `${fragment.layer}|${Math.round(fragment.textBounds.x / 4)}|${Math.round(fragment.textBounds.y / 4)}|${fragment.text}`;
      const entry = textTwinRegistry.get(slot);
      if (entry) fragment.textTwin = entry;
      else textTwinRegistry.set(slot, fragment);
    }
    const tasks = [];
    const scheduleJob = (y, spec, deps, layer) => {
      const phaseValue = {
        id: tasks.length,
        y,
        spec,
        deps,
        state: "wait",
        doneAt: 0,
        layer,
        animated: !!(spec.it && spec.it.animated),
      };
      tasks.push(phaseValue);
      return phaseValue;
    };
    const FRAGMENT_JOB_TYPES = {
      rect: "rect",
      image: "image",
      text: "text",
      line: "line",
    };
    for (const fragment of items) {
      if (fragment.templateFragment) continue;
      if (fragment.textTwin) {
        fragment.completionJobs = fragment.textTwin.completionJobs;
        continue;
      }
      const deps = [];
      const y = fragment.kind === "text" ? fragment.textBounds.y : fragment.y;
      if (fragment.animated && fragment.kind === "image") {
        fragment.revealProgress = 0;
        fragment.completionJobs = Array.from(
          {
            length: CREW_MINIMUM,
          },
          (ignoredError, worker) =>
            scheduleJob(
              y,
              {
                type: "animation-sweep",
                it: fragment,
                worker,
              },
              [],
              fragment.layer,
            ),
        );
        continue;
      }
      fragment.assignment = scheduleJob(
        y,
        {
          type: FRAGMENT_JOB_TYPES[fragment.kind],
          it: fragment,
        },
        deps,
        fragment.layer,
      );
      fragment.completionJobs = [fragment.assignment];
    }
    for (let groupIndex = groups.length - 1; groupIndex >= 0; groupIndex--) {
      const alignmentGuide = groups[groupIndex];
      const masterFragments = items.slice(alignmentGuide.master.start, alignmentGuide.master.end);
      const masterPrerequisites = [];
      for (const fragment of masterFragments)
        if (fragment.completionJobs) masterPrerequisites.push(...fragment.completionJobs);
      if (
        alignmentGuide.master.start < alignmentGuide.master.end &&
        items[alignmentGuide.master.start].parentPanel &&
        items[alignmentGuide.master.start].parentPanel.completionJobs
      )
        masterPrerequisites.push(...items[alignmentGuide.master.start].parentPanel.completionJobs);
      alignmentGuide.src = {
        fragments: masterFragments,
        box: alignmentGuide.master.box,
      };
      alignmentGuide.dst = alignmentGuide.copies.map((candidate, slot) => {
        const copyFragments = items
          .slice(candidate.start, candidate.end)
          .filter((fragment) => fragment.group === alignmentGuide);
        const minimumY = Math.min(
          ...copyFragments.map((fragment) => (fragment.kind === "text" ? fragment.textBounds.y : fragment.y)),
        );
        const task = scheduleJob(
          minimumY,
          {
            type: "dup",
            g: alignmentGuide,
            k: slot,
          },
          masterPrerequisites,
          candidate.layer,
        );
        task.animated = copyFragments.some((fragment) => fragment.animated);
        for (const fragment of copyFragments) {
          fragment.dupTask = task;
          fragment.completionJobs = [task];
          const entry = fragment.templateFragment;
          let type = null;
          if (fragment.kind === "text" && fragment.sig !== entry.sig) type = "edit";
          else if (fragment.kind === "image" && fragment.sig !== entry.sig) type = "swap";
          else if (fragment.kind === "rect" && fragment.sig !== entry.sig) type = "restyle";
          if (type) {
            fragment.editTask = scheduleJob(
              fragment.kind === "text" ? fragment.textBounds.y : fragment.y,
              {
                type,
                it: fragment,
              },
              [task],
              fragment.layer,
            );
            fragment.completionJobs = [task, fragment.editTask];
          }
        }
        return {
          fragments: copyFragments,
          box: candidate.box,
          assignment: task,
        };
      });
    }
    const guides = [];
    const textFragments = items.filter(
      (fragment) =>
        fragment.kind === "text" &&
        fragment.assignment &&
        fragment.layer === "world" &&
        fragment.fs >= 13 &&
        fragment.textBounds.w > 30,
    );
    const ALIGNMENT_TOLERANCE = 900;
    const alignmentBands = new Map();
    for (const fragment of textFragments) {
      const slot = Math.floor(fragment.textBounds.y / ALIGNMENT_TOLERANCE);
      if (!alignmentBands.has(slot)) alignmentBands.set(slot, []);
      alignmentBands.get(slot).push(fragment);
    }
    for (const [, list] of [...alignmentBands.entries()].sort(
      (firstValue, secondValue) => firstValue[0] - secondValue[0],
    )) {
      if (guides.length >= 16) break;
      const byX = new Map();
      for (const fragment of list) {
        const x = Math.round(fragment.textBounds.x);
        if (!byX.has(x)) byX.set(x, []);
        byX.get(x).push(fragment);
      }
      let best = null;
      for (const [x, leftEdge] of byX)
        if (leftEdge.length >= 3 && (!best || leftEdge.length > best[1].length)) best = [x, leftEdge];
      if (best) {
        const top = Math.min(...best[1].map((entry) => entry.textBounds.y));
        const members = best[1]
          .filter((entry) => entry.textBounds.y < top + 450)
          .sort((firstValue, secondValue) => secondValue.fs - firstValue.fs)
          .slice(0, 2);
        const alignmentGuide = {
          axis: "x",
          pos: best[0],
          cur: best[0],
          op: 1,
          flash: 0,
          dragging: false,
          isVisible: false,
        };
        guides.push(alignmentGuide);
        const desiredVelocityY = Math.min(...members.map((entry) => entry.textBounds.y)) - 30;
        alignmentGuide.assignment = scheduleJob(
          desiredVelocityY,
          {
            type: "guide",
            g: alignmentGuide,
          },
          [],
          "world",
        );
        alignmentGuide.deps = [];
        for (const entry of members) {
          entry.assignment.spec.playSnapCue = alignmentGuide;
          entry.assignment.spec.snapDx = entry.textBounds.x - best[0];
          alignmentGuide.deps.push(entry.assignment);
        }
      }
      const byY = new Map();
      for (const fragment of list) {
        const y = Math.round(fragment.textBounds.y);
        if (!byY.has(y)) byY.set(y, []);
        byY.get(y).push(fragment);
      }
      let row = null;
      for (const [y, leftEdge] of byY)
        if (leftEdge.length >= 3 && (!row || leftEdge.length > row[1].length)) row = [y, leftEdge];
      if (row) {
        const entry = row[1].find((fragment) => !fragment.assignment.spec.playSnapCue);
        if (entry) {
          const alignmentGuide = {
            axis: "y",
            pos: row[0],
            cur: row[0],
            op: 1,
            flash: 0,
            dragging: false,
            isVisible: false,
          };
          guides.push(alignmentGuide);
          alignmentGuide.assignment = scheduleJob(
            row[0] - 30,
            {
              type: "guide",
              g: alignmentGuide,
            },
            [],
            "world",
          );
          alignmentGuide.deps = [entry.assignment];
          entry.assignment.spec.playSnapCue = alignmentGuide;
        }
      }
    }
    for (const fragment of items)
      if (fragment.kind === "text" && fragment.assignment && fragment.fs >= 28 && fragment.textBounds.h < 400)
        fragment.assignment.spec.playGrowthCue = true;
    for (const phaseValue of tasks)
      if (phaseValue.deps.some((nodeValue) => nodeValue.animated)) phaseValue.animated = true;
    for (const phaseValue of tasks) phaseValue.gate = phaseValue.y;
    for (let indexValue = tasks.length - 1; indexValue >= 0; indexValue--)
      for (const nodeValue of tasks[indexValue].deps)
        if (tasks[indexValue].gate < nodeValue.gate) nodeValue.gate = tasks[indexValue].gate;
    const backdrops = [];
    if (pageBg.image === "none")
      for (const secondValue of bars) {
        const area = secondValue.r.width * secondValue.r.height;
        const covered = items.some(
          (fragment) =>
            fragment.id >= secondValue.start &&
            fragment.layer === "over" &&
            fragment.kind === "rect" &&
            fragment.w * fragment.h >= area * 0.85 &&
            /rgba?\(/.test(fragment.css) &&
            !/background-color:\s*rgba\([^)]*,\s*0(\.\d+)?\)/.test(fragment.css),
        );
        if (!covered)
          backdrops.push({
            x: secondValue.r.left,
            y: secondValue.r.top,
            w: secondValue.r.width,
            h: secondValue.r.height,
            key: secondValue.key,
            color: pageBg.color,
          });
      }
    return {
      fragments: items,
      jobs: tasks,
      repeatedComponents: groups,
      alignmentGuides: guides,
      docW: documentWidth,
      docH: documentHeight,
      backdropPanels: backdrops,
      portKey,
    };
  }
  function resolveWhitespaceMode(quantity, root) {
    for (let e = quantity; e && e !== root.parentNode; e = e.parentNode) {
      const widthValue = e.style && e.style.whiteSpace;
      if (widthValue) return widthValue;
    }
    return "normal";
  }
  function prepareGlyphReveal(fragment) {
    const live = fragment.full.cloneNode(true);
    const units = [];
    let glyphSequence = "";
    const boxes = [];
    (function visitTextNodes(quantity, box) {
      for (const candidate of [...quantity.childNodes]) {
        if (candidate.nodeType === 3) {
          let markup = candidate.data;
          const ws = resolveWhitespaceMode(quantity, live);
          if (!/^pre|break-spaces/.test(ws)) markup = markup.replace(/[\t\n\r ]+/g, " ");
          if (!markup.length) {
            candidate.remove();
            continue;
          }
          units.push({
            t: candidate,
            s: markup,
            len: markup.length,
            box,
          });
          glyphSequence += markup;
        } else if (candidate.nodeType === 1) {
          if (
            INDIVISIBLE_TAGS.has(candidate.localName) ||
            candidate instanceof SVGElement ||
            (!/\S/.test(candidate.textContent) && candidate.style && hasVisibleSurface(candidate.style))
          ) {
            units.push({
              e: candidate,
              len: 1,
              box,
              on: true,
            });
            glyphSequence += "□";
          } else {
            const secondValue = candidate.style && hasVisibleSurface(candidate.style) ? candidate : box;
            if (secondValue === candidate) boxes.push(candidate);
            visitTextNodes(candidate, secondValue);
          }
        }
      }
    })(live, null);
    for (const segment of units) {
      if (segment.t) segment.t.data = "";
      else {
        segment.e.style.visibility = "hidden";
        segment.on = false;
      }
    }
    for (const secondValue of boxes) {
      secondValue.style.visibility = "hidden";
      secondValue.__on = false;
    }
    fragment.live = live;
    fragment.units = units;
    fragment.seq = glyphSequence;
    fragment.glyphCount = glyphSequence.length;
    fragment.visibleGlyphCount = 0;
    fragment.rshown = 0;
  }
  function advanceGlyphReveal(fragment, quantity) {
    let left = quantity;
    let last = null;
    for (const segment of fragment.units) {
      const slot = left <= 0 ? 0 : left >= segment.len ? segment.len : left;
      left -= slot;
      if (segment.t) {
        const want = slot === segment.len ? segment.s : segment.s.slice(0, slot);
        if (segment.t.data !== want) segment.t.data = want;
        if (slot) last = segment.t;
      } else {
        const on = slot > 0;
        if (segment.on !== on) {
          segment.e.style.visibility = on ? "" : "hidden";
          segment.on = on;
        }
        if (on) last = segment.e;
      }
      if (slot && segment.box && segment.box.__on === false) {
        for (
          let secondValue = segment.box;
          secondValue && secondValue !== fragment.live;
          secondValue = secondValue.parentNode
        )
          if (secondValue.__on === false) {
            secondValue.style.visibility = "";
            secondValue.__on = true;
          }
      }
    }
    return last;
  }
  const SCENE_CSS = `
:host{all:initial}
*{box-sizing:border-box}
.bg{position:absolute;inset:0;opacity:0;transition:opacity .5s ease}
.bg.on{opacity:1}
.layer,.port{position:absolute;overflow:hidden;pointer-events:none}
.layer{inset:0}
.world{position:absolute;left:0;top:0;will-change:transform}
.it{position:absolute;left:0;top:0;transform-origin:0 0}
.it.settle{transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.it[data-garbage]{background:transparent!important;box-shadow:none!important;border-color:transparent!important;mix-blend-mode:normal!important;opacity:1!important}
.it[data-garbage] *,.it.error-erase>*{visibility:hidden!important}
.it[data-garbage]::after{content:attr(data-garbage);position:absolute;inset:0;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere;padding:4px;background:transparent;color:#F24822;font:700 12px/15px ui-monospace,Consolas,monospace;letter-spacing:2px;z-index:1}
.it.error-erase{animation:robot-failure-erase .22s ease-in forwards}
@keyframes robot-failure-erase{0%{opacity:1;clip-path:inset(0)}45%{opacity:.8;clip-path:inset(40% 0 35%)}100%{opacity:0;clip-path:inset(50% 0 50%)}}
.r{background-color:var(--ph,#D9D9D9);transition:background-color .22s ease,border-radius .22s ease}
.r.st{background-color:transparent}
.r>.f{position:absolute;inset:0;opacity:0;transition:opacity .22s ease,background-color .35s ease,border-radius .35s ease,box-shadow .35s ease,border-color .35s ease}
.r.st>.f{opacity:1}
.m{background-color:var(--ph,#D9D9D9);overflow:hidden}
.m>.ph{position:absolute;left:50%;top:50%;width:22px;height:22px;transform:translate(-50%,-50%);opacity:.7;transition:opacity .2s}
.m>.md{position:absolute;inset:0;width:100%;height:100%;opacity:0;clip-path:inset(0 0 100% 0);transition:opacity .35s ease,clip-path .6s cubic-bezier(.2,.75,.2,1)}
.m.st{background-color:transparent;transition:background-color .3s ease .3s}
.m.st>.ph{opacity:0}
.m.st>.md{opacity:1;clip-path:inset(0 0 0 0)}
.m>.md.swap{animation:swap .45s ease}
@keyframes swap{from{opacity:0;filter:blur(6px)}}
.m>.fr{position:absolute;inset:0;pointer-events:none}
.m.media-glitch>.md{animation:media-jitter .31s steps(1,end) infinite;transition:none}
.m.media-glitch::before,.m.media-glitch::after{content:"";position:absolute;pointer-events:none;z-index:2}
.m.media-glitch::before{inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,#884ffe26 3px 4px);animation:media-static .23s steps(1,end) infinite;mix-blend-mode:screen}
.m.media-glitch::after{left:var(--reveal-edge);top:0;bottom:0;width:2px;transform:translateX(-50%);background:#d9ccff;box-shadow:0 0 12px 3px #884ffe,0 0 25px #42e8ee;animation:media-static .17s steps(1,end) infinite}
@keyframes media-jitter{0%,18%,42%,72%,100%{transform:none}19%{transform:translateX(-3px) skewX(.4deg)}24%{transform:translateX(2px)}43%{transform:translateX(4px) skewX(-.3deg)}48%{transform:none}73%{transform:translateX(-2px)}}
@keyframes media-static{0%,30%,65%,100%{opacity:.12}12%,38%,74%{opacity:.8}22%,52%,86%{opacity:.3}}
.l svg{position:absolute;left:0;top:0;overflow:visible}
.bd{position:absolute;opacity:0;-webkit-backdrop-filter:saturate(180%) blur(14px);backdrop-filter:saturate(180%) blur(14px);box-shadow:0 1px 0 rgba(0,0,0,.06);pointer-events:none}
.caret{display:inline-block;position:relative;width:0;height:0;vertical-align:baseline}
.caret::after{content:"";position:absolute;left:1px;bottom:-.15em;width:1.5px;height:1em;background:currentColor;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.sa{background-color:rgba(13,153,255,.28)!important}
.ov{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.badges,.cursors{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.badge{position:absolute;transform:translate(-50%);padding:1px 4px;border-radius:2px;color:#fff;font:600 11px/16px Inter,system-ui,-apple-system,"Segoe UI",sans-serif;white-space:nowrap;font-variant-numeric:tabular-nums}
.badge.warning{z-index:3;padding:3px 7px;background:#F24822;color:#fff;font:700 10px/14px ui-monospace,Consolas,monospace;box-shadow:0 0 12px rgba(242,72,34,.55)}
.cursor{position:absolute;left:0;top:0;will-change:transform}
.cursor svg{position:absolute;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.28))}
.explosions{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.explosion{position:absolute;width:112px;height:112px;transform:translate(-50%,-50%);image-rendering:pixelated;pointer-events:none}
.robot-body{transform-origin:24px 20px}
.robot-eyes{transform-origin:24px 18px;animation:robot-blink 4.7s infinite;animation-delay:var(--phase)}
.robot-warning-eye,.robot-jet{display:none}
.robot-tool{opacity:0}
.cursor[data-state="work"] .robot-tool,.cursor[data-state="error"] .robot-tool{opacity:1}
.cursor[data-state="work"] .robot-arm{animation:robot-arm .55s ease-in-out infinite alternate;transform-origin:13px 24px;animation-delay:var(--phase)}
.cursor[data-state="type"] .robot-tool{opacity:1}
.cursor[data-state="type"] .robot-eyes{animation:robot-type .24s ease-in-out infinite alternate}
.cursor[data-state="fly"] .robot-jet,.cursor[data-state="return"] .robot-jet{display:block;animation:robot-thrust .18s ease-in-out infinite alternate;transform-origin:24px 30px}
.cursor[data-state="return"] .robot-legs,.cursor[data-state="return"] .robot-arm{transform:translateY(-3px)}
.cursor[data-state="error"] .robot-eyes{display:none}
.cursor[data-state="error"] .robot-warning-eye{display:block}
@keyframes robot-blink{0%,43%,47%,100%{transform:scaleY(1)}45%{transform:scaleY(.12)}}
@keyframes robot-type{from{transform:translateX(-1px)}to{transform:translateX(1px)}}
@keyframes robot-arm{from{transform:rotate(-6deg)}to{transform:rotate(8deg)}}
@keyframes robot-thrust{from{transform:scaleY(.55);opacity:.4}to{transform:scaleY(1);opacity:.85}}
@media(prefers-reduced-motion:reduce){.robot-eyes,.robot-jet,.robot-arm{animation:none!important}}
.rulers{position:absolute;inset:0;pointer-events:none}
.ruler{position:absolute;background:#2c2c2c;pointer-events:none}
.ruler svg{display:block}
.ruler-top{top:0;left:0;right:0;height:20px;background:#1c152d;border-bottom:1px solid #884ffe}
.ruler-top svg{fill:#884ffe}
.ruler-left{top:0;left:0;bottom:0;width:20px;background:#192311;border-right:1px solid #84ff00}
.ruler-left svg{fill:#84ff00}
.ruler-corner{position:absolute;top:0;left:0;width:20px;height:20px;background:linear-gradient(135deg,#884ffe 0 50%,#84ff00 50%)}
.rtext{font:500 9px Inter,system-ui,-apple-system,sans-serif;fill:inherit}
.rsel{font-weight:700}
.hud{position:absolute;left:50%;bottom:20px;transform:translate(-50%,18px);opacity:0;display:flex;align-items:center;gap:10px;padding:6px 6px 6px 10px;background:rgba(30,30,30,.94);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,255,255,.07);font:500 12px/1 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:auto;transition:opacity .45s ease,transform .45s cubic-bezier(.2,.8,.2,1);white-space:nowrap;user-select:none;z-index:5}
.hud.on{opacity:1;transform:translate(-50%,0)}
.hud .dots{display:flex;padding-left:5px}
.hud .dots i{display:block;width:18px;height:18px;margin-left:-5px;border-radius:50%;border:2px solid #1e1e1e;font:700 9px/14px Inter,system-ui,sans-serif;font-style:normal;text-align:center;color:#fff;transition:background .3s}
.hud .txt,.hud .status{display:flex;align-items:center;gap:7px;color:#cfcfcf;font-variant-numeric:tabular-nums}
.hud .txt b{color:#fff;font-weight:600}
.hud .sep{width:1px;height:12px;background:#444}
.hud .bar{width:64px;height:3px;border-radius:2px;background:#3a3a3a;overflow:hidden}
.hud .bar i{display:block;height:100%;width:0;background:#0D99FF;transition:width .35s ease}
.hud button{all:unset;cursor:pointer;padding:7px 10px;border-radius:8px;background:#2c2c2c;color:#fff;font:500 12px/1 Inter,system-ui,-apple-system,sans-serif;transition:background .15s}
.hud button:hover{background:#3a3a3a}
.hud button.pri{background:#0D99FF}
.hud button.pri:hover{background:#2aa6ff}
.hud button.on{background:rgba(13,153,255,.22);color:#8fd0ff}
.hud button[hidden]{display:none}
.hud .x{padding:7px 9px;color:#aaa}
.hud button.snd{display:flex;align-items:center;gap:6px;padding:6px 8px}
.hud button.snd.off{color:#8a8a8a}
.hud button.snd.tap{background:#0D99FF;animation:hudpulse 1.6s ease-in-out infinite}
@keyframes hudpulse{50%{box-shadow:0 0 0 4px rgba(13,153,255,.28)}}
`;
  function inspectScrollContext() {
    const scrollingElement = document.scrollingElement || document.documentElement;
    let scrollingContainer = scrollingElement;
    let isRoot = true;
    if (scrollingElement.scrollHeight <= innerHeight + 4) {
      let best = null;
      let bestArea = 0;
      const all = document.body ? document.body.getElementsByTagName("*") : [];
      for (let indexValue = 0; indexValue < all.length && indexValue < 20000; indexValue++) {
        const element = all[indexValue];
        if (element.scrollHeight <= element.clientHeight + 40 || element.clientHeight < innerHeight * 0.4)
          continue;
        const viewportOffsetY = getComputedStyle(element).overflowY;
        if (!/(auto|scroll|overlay)/.test(viewportOffsetY)) continue;
        const rectangle = element.getBoundingClientRect();
        const area = rectangle.width * rectangle.height;
        if (area > bestArea && rectangle.width > innerWidth * 0.35) {
          best = element;
          bestArea = area;
        }
      }
      if (best) {
        scrollingContainer = best;
        isRoot = false;
      }
    }
    const scrollContext = {
      scroller: scrollingContainer,
      isRoot,
      host: null,
      pageBg: inspectPageBackdrop(),
      geom() {
        if (isRoot) {
          return {
            ox: 0,
            oy: 0,
            sx: window.scrollX,
            sy: window.scrollY,
            vw: document.documentElement.clientWidth,
            vh: window.innerHeight,
          };
        }
        const rectangle = scrollingContainer.getBoundingClientRect();
        return {
          ox: rectangle.left + scrollingContainer.clientLeft,
          oy: rectangle.top + scrollingContainer.clientTop,
          sx: scrollingContainer.scrollLeft,
          sy: scrollingContainer.scrollTop,
          vw: scrollingContainer.clientWidth,
          vh: scrollingContainer.clientHeight,
        };
      },
      scrollHeight: () =>
        isRoot
          ? Math.max(scrollingElement.scrollHeight, document.body ? document.body.scrollHeight : 0)
          : scrollingContainer.scrollHeight,
      scrollWidth: () => (isRoot ? scrollingElement.scrollWidth : scrollingContainer.scrollWidth),
      scrollTo(y, x) {
        const scrollCandidates = {
          top: y,
          behavior: "instant",
        };
        if (x != null) scrollCandidates.left = x;
        if (isRoot) window.scrollTo(scrollCandidates);
        else scrollingContainer.scrollTo(scrollCandidates);
      },
      scrollBy(verticalDelta) {
        if (isRoot)
          window.scrollBy({
            top: verticalDelta,
            behavior: "instant",
          });
        else
          scrollingContainer.scrollBy({
            top: verticalDelta,
            behavior: "instant",
          });
      },
    };
    return scrollContext;
  }
  /* Own the isolated drawing surface; page styles cannot leak into its shadow root.*/
  class SceneSurface {
    constructor(scrollContext) {
      this.scrollContext = scrollContext;
      this.lockedViewport = null;
      for (const old of document.querySelectorAll("robot-animation-stage")) old.remove();
      const host = document.createElement("robot-animation-stage");
      host.style.cssText =
        "all:initial !important;position:fixed !important;inset:0 !important;z-index:2147483647 !important;display:block !important;pointer-events:auto !important;contain:strict !important;opacity:1;transition:opacity .6s ease;";
      scrollContext.host = host;
      this.host = host;
      const root = host.attachShadow({
        mode: "open",
      });
      this.root = root;
      root.innerHTML = `<style>${SCENE_CSS}</style>
<div class="bg"></div>
<div class="layer under"></div>
<div class="port"><div class="world"></div></div>
<div class="layer over"></div>
<svg class="ov"></svg>
<div class="badges"></div>
<canvas class="info-flow" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>
<div class="cursors"></div>
<div class="explosions"></div>
<div class="rulers"></div>
<div class="hud">
  <div class="dots"></div>
  <div class="txt"><span class="status">Scanning page…</span></div>
  <div class="bar"><i></i></div>
  <button data-a="tour" title="Auto-scroll while the robot crew builds">Tour</button>
  <button data-a="speed" title="Build speed">1×</button>
  <button data-a="sound" class="snd" title="Sound (M)"></button>
  <button data-a="live" class="pri" hidden title="Fade back to the real page">Go live</button>
  <button data-a="replay" hidden title="Wipe and rebuild again">Replay</button>
  <button data-a="close" class="x" title="Exit (Esc)">✕</button>
</div>`;
      const findSceneNode = (markup) => root.querySelector(markup);
      this.bg = findSceneNode(".bg");
      this.under = findSceneNode(".under");
      this.over = findSceneNode(".over");
      this.scrollWindow = findSceneNode(".port");
      this.world = findSceneNode(".world");
      this.vectorOverlay = findSceneNode(".ov");
      this.metricLabels = findSceneNode(".badges");
      this.robotLayer = findSceneNode(".cursors");
      this.rulers = findSceneNode(".rulers");
      this.controlBar = findSceneNode(".hud");
      this.status = findSceneNode(".status");
      this.progressFill = findSceneNode(".bar i");
      this.crewIndicators = findSceneNode(".dots");
      this.robotNodes = new Map();
      this.blastLayer = findSceneNode(".explosions");
      this.blastNodes = new Map();
      this.blastAssetAddress = chrome.runtime.getURL("assets/robot-explosion.gif");
      this.signalCanvas = findSceneNode(".info-flow");
      this.signalLinks = new Map();
      this.lastVectorMarkup = "";
      this.lastMetricMarkup = "";
      this.rulersMounted = false;
      const backdropAppearance = scrollContext.pageBg;
      this.bg.style.backgroundColor = backdropAppearance.color;
      const rgb = (backdropAppearance.color.match(/[\d.]+/g) || [255, 255, 255]).map(Number);
      const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
      if (lum < 0.4) this.host.style.setProperty("--ph", "#3B3D42");
      if (backdropAppearance.image && backdropAppearance.image !== "none") {
        this.bg.style.backgroundImage = backdropAppearance.image;
        this.bg.style.backgroundSize = backdropAppearance.size;
        this.bg.style.backgroundPosition = backdropAppearance.position;
        this.bg.style.backgroundRepeat = backdropAppearance.repeat;
      }
      document.documentElement.appendChild(host);
      this.refreshViewport();
    }
    get viewportState() {
      if (this.lockedViewport) return this.lockedViewport;
      const alignmentGuide = this.scrollContext.geom();
      return {
        ...alignmentGuide,
        ox: this.g.ox,
        oy: this.g.oy,
      };
    }
    refreshViewport() {
      this.surfaceWidth = innerWidth;
      this.surfaceHeight = innerHeight;
      this.g = this.scrollContext.geom();
      const alignmentGuide = this.g;
      this.scrollWindow.style.left = alignmentGuide.ox + "px";
      this.scrollWindow.style.top = alignmentGuide.oy + "px";
      this.scrollWindow.style.width = alignmentGuide.vw + "px";
      this.scrollWindow.style.height = alignmentGuide.vh + "px";
    }
    syncDocumentPosition() {
      const viewportState = this.viewportState;
      this.world.style.transform = `translate(${-viewportState.sx}px,${-viewportState.sy}px)`;
    }
    attachBlueprint(model) {
      this.world.style.width = model.docW + "px";
      this.world.style.height = model.docH + "px";
      const layerBuckets = {
        world: [],
        under: [],
        over: [],
      };
      for (const fragment of model.fragments) layerBuckets[fragment.layer].push(fragment);
      if (model.portKey != null) {
        const screen = [...layerBuckets.under, ...layerBuckets.over].sort(
          (firstValue, secondValue) => firstValue.key - secondValue.key,
        );
        const frag = document.createDocumentFragment();
        let placed = false;
        for (const fragment of screen) {
          if (!placed && fragment.key > model.portKey) {
            frag.appendChild(this.scrollWindow);
            placed = true;
          }
          frag.appendChild(this.createFragmentNode(fragment));
        }
        if (!placed) frag.appendChild(this.scrollWindow);
        this.over.appendChild(frag);
        const documentFragments = layerBuckets.world.sort(
          (firstValue, secondValue) => firstValue.key - secondValue.key,
        );
        const documentFragmentBatch = document.createDocumentFragment();
        for (const fragment of documentFragments)
          documentFragmentBatch.appendChild(this.createFragmentNode(fragment));
        this.world.appendChild(documentFragmentBatch);
      } else
        for (const layer of ["under", "world", "over"]) {
          const list = layerBuckets[layer].sort(
            (firstValue, secondValue) => firstValue.key - secondValue.key,
          );
          const frag = document.createDocumentFragment();
          for (const fragment of list) frag.appendChild(this.createFragmentNode(fragment));
          (layer === "world" ? this.world : this[layer]).appendChild(frag);
        }
      this.backdropPanels = (model.backdropPanels || []).map((secondValue) => {
        const nodeValue = document.createElement("div");
        nodeValue.className = "bd";
        const rgb = (secondValue.color.match(/[\d.]+/g) || [255, 255, 255]).slice(0, 3).join(",");
        nodeValue.setAttribute(
          "style",
          `left:${secondValue.x}px;top:${secondValue.y}px;width:${secondValue.w}px;height:${secondValue.h}px;background:rgba(${rgb},.82);`,
        );
        this.over.insertBefore(nodeValue, this.over.firstChild);
        return nodeValue;
      });
      this.backdropScrollOrigin = this.scrollContext.geom().sy;
    }
    createFragmentNode(fragment) {
      const quantity = document.createElement("div");
      quantity.style.display = "none";
      fragment.node = quantity;
      if (fragment.kind === "rect") {
        quantity.className = "it r";
        const f = document.createElement("div");
        f.className = "f";
        quantity.appendChild(f);
      } else if (fragment.kind === "image") {
        quantity.className = "it m";
        quantity.innerHTML = MEDIA_PLACEHOLDER_GLYPH;
      } else if (fragment.kind === "text") {
        quantity.className = "it t";
        prepareGlyphReveal(fragment);
      } else if (fragment.kind === "line") {
        quantity.className = "it l";
        quantity.innerHTML = '<svg width="1" height="1"><path fill="none"/></svg>';
      }
      if (fragment.op < 0.999) quantity.style.opacity = fragment.op;
      if (fragment.blend) quantity.style.mixBlendMode = fragment.blend;
      return quantity;
    }
    paintFragment(fragment) {
      if (fragment.repairAncestor && fragment.repairAncestor.repairPending) {
        fragment.node.style.display = "none";
        fragment.paintedRevision = 0;
        return;
      }
      const live = fragment.mode === "master" ? fragment.templateFragment : fragment;
      const canvas = fragment.node._liveCanvas;
      if (fragment.isVisible && (live.sourceCanvas || live.sourceVideo) && canvas) {
        const source = live.sourceVideo || live.sourceCanvas;
        const widthValue = live.sourceVideo ? source.videoWidth : source.width;
        const heightValue = live.sourceVideo ? source.videoHeight : source.height;
        if (widthValue && heightValue && (!live.sourceVideo || source.readyState >= 2)) {
          if (canvas.width !== widthValue) canvas.width = widthValue;
          if (canvas.height !== heightValue) canvas.height = heightValue;
          const drawingContext = canvas.getContext("2d");
          drawingContext.clearRect(0, 0, widthValue, heightValue);
          drawingContext.drawImage(source, 0, 0);
          if (fragment.revealProgress > 0 && fragment.revealProgress < 1) {
            const phase = Math.floor(fragment.revealProgress * 28);
            if (phase % 4 !== 3) {
              for (let indexValue = 0; indexValue < 2; indexValue++) {
                const y = Math.floor((((phase * 37 + indexValue * 43) % 90) / 100) * heightValue);
                const strip = Math.max(1, Math.floor(heightValue * (indexValue ? 0.018 : 0.045)));
                const offset =
                  Math.max(2, Math.round(widthValue * 0.025)) * ((phase + indexValue) % 2 ? -1 : 1);
                drawingContext.drawImage(source, 0, y, widthValue, strip, offset, y, widthValue, strip);
              }
            }
          }
        }
      }
      const tw = fragment.textTwin;
      if (tw && fragment._tv !== tw.revision) {
        fragment._tv = tw.revision;
        fragment.isVisible = tw.isVisible;
        fragment.visibleGlyphCount = tw.glyphCount
          ? Math.round((tw.visibleGlyphCount / tw.glyphCount) * fragment.glyphCount)
          : fragment.glyphCount;
        fragment.dx = tw.dx;
        fragment.dy = tw.dy;
        fragment.scale = tw.scale;
        fragment.done = tw.done;
        fragment.revision++;
      }
      if (fragment.paintedRevision === fragment.revision) return;
      fragment.paintedRevision = fragment.revision;
      const quantity = fragment.node;
      if (fragment.revealProgress != null) {
        quantity.classList.toggle(
          "media-glitch",
          fragment.isVisible && fragment.revealProgress > 0 && fragment.revealProgress < 1,
        );
        quantity.style.setProperty(
          "--reveal-edge",
          `${(fragment.revealFromRight ? 1 - fragment.revealProgress : fragment.revealProgress) * 100}%`,
        );
        quantity.style.maskImage = "linear-gradient(#000,#000)";
        quantity.style.maskSize = `${fragment.w * fragment.revealProgress}px ${fragment.h}px`;
        quantity.style.maskPosition = fragment.revealFromRight ? "right top" : "left top";
        quantity.style.maskRepeat = "no-repeat";
      }
      if (!fragment.isVisible) {
        if (quantity.style.display !== "none") quantity.style.display = "none";
        return;
      }
      if (quantity.style.display === "none") quantity.style.display = "";
      if (fragment.settle) {
        fragment.settle = false;
        quantity.classList.add("settle");
        clearTimeout(quantity._st);
        quantity._st = setTimeout(() => quantity.classList.remove("settle"), 340);
      }
      if (fragment.kind === "line") {
        quantity.style.transform = `translate(${fragment.dx}px,${fragment.dy}px)`;
        const pts = fragment.pts.slice(0, fragment.placed);
        const nodeValue =
          pts.map((point, indexValue) => `${indexValue ? "L" : "M"}${point.x} ${point.y}`).join(" ") +
          (fragment.shut ? " Z" : "");
        const path = quantity.firstChild.firstChild;
        path.setAttribute("d", nodeValue);
        path.setAttribute("stroke", fragment.stroke);
        path.setAttribute("stroke-width", fragment.sw);
        path.setAttribute("stroke-linecap", "square");
        if (fragment.dash) path.setAttribute("stroke-dasharray", fragment.dash);
        return;
      }
      const widthValue = fragment.draw ? fragment.draw.w : fragment.w;
      const heightValue = fragment.draw ? fragment.draw.h : fragment.h;
      let tf = `translate(${fragment.x + fragment.dx}px,${fragment.y + fragment.dy}px)`;
      if (fragment.scale !== 1) tf += ` scale(${fragment.scale})`;
      quantity.style.transform = tf;
      quantity.style.width = widthValue + "px";
      quantity.style.height = heightValue + "px";
      const candidate = fragment.clip;
      quantity.style.clipPath =
        fragment.done && candidate
          ? `inset(${Math.max(0, candidate.t - fragment.y)}px ${Math.max(0, fragment.x + fragment.w - candidate.r)}px ${Math.max(0, fragment.y + fragment.h - candidate.b)}px ${Math.max(0, candidate.l - fragment.x)}px)`
          : "";
      if (fragment.kind === "rect") {
        const appearanceOf = fragment.mode === "master" ? fragment.templateFragment.css : fragment.css;
        if (quantity._css !== appearanceOf) {
          quantity.firstChild.setAttribute("style", appearanceOf);
          quantity._css = appearanceOf;
        }
        quantity.classList.toggle("st", !!fragment.styled);
        quantity.style.borderRadius = fragment.styled
          ? fragment.mode === "master"
            ? fragment.templateFragment.radius
            : fragment.radius
          : "0px";
      } else if (fragment.kind === "image") {
        const sourceElement = fragment.mode === "master" ? fragment.templateFragment : fragment;
        if (quantity._src !== sourceElement) {
          const old = quantity.querySelector(".md");
          const entry = sourceElement.media.cloneNode(true);
          entry.classList.add("md");
          if (old) {
            entry.classList.add("swap");
            old.replaceWith(entry);
          } else quantity.appendChild(entry);
          quantity._liveCanvas = sourceElement.sourceCanvas || sourceElement.sourceVideo ? entry : null;
          quantity._src = sourceElement;
          if (sourceElement.frameStyle) {
            let fr = quantity.querySelector(".fr");
            if (!fr) {
              fr = document.createElement("div");
              fr.className = "fr";
              quantity.appendChild(fr);
            }
            fr.setAttribute("style", sourceElement.frameStyle + `border-radius:${sourceElement.radius};`);
          }
        }
        quantity.classList.toggle("st", !!fragment.styled);
        quantity.style.borderRadius = fragment.styled ? sourceElement.radius : "0px";
        quantity.style.boxShadow = fragment.styled ? sourceElement.shadow : "";
        quantity.style.backgroundColor = fragment.styled && sourceElement.bg ? sourceElement.bg : "";
      } else if (fragment.kind === "text") {
        let content;
        if (fragment.mode === "master") {
          if (!fragment._mv) fragment._mv = fragment.templateFragment.full.cloneNode(true);
          content = fragment._mv;
        } else content = fragment.live;
        if (quantity.firstChild !== content) {
          quantity.textContent = "";
          quantity.appendChild(content);
        }
        if (fragment.mode !== "master" && fragment.rshown !== fragment.visibleGlyphCount) {
          fragment._last = advanceGlyphReveal(fragment, fragment.visibleGlyphCount);
          fragment.rshown = fragment.visibleGlyphCount;
        }
        content.classList.toggle("sa", !!fragment.allGlyphsSelected);
        const wantCaret = fragment.typingActive && !fragment.allGlyphsSelected && fragment.mode !== "master";
        if (wantCaret) {
          if (!fragment._caret) {
            fragment._caret = document.createElement("span");
            fragment._caret.className = "caret";
          }
          const last = fragment._last;
          if (last && last.parentNode) last.parentNode.insertBefore(fragment._caret, last.nextSibling);
          else content.insertBefore(fragment._caret, content.firstChild);
        } else if (fragment._caret && fragment._caret.parentNode) fragment._caret.remove();
        if (fragment.scale !== 1) {
          const viewportOffsetX =
            fragment.textBounds.x -
            fragment.x +
            (fragment.align === "center"
              ? fragment.textBounds.w / 2
              : fragment.align === "right" || fragment.align === "end"
                ? fragment.textBounds.w
                : 0);
          quantity.style.transformOrigin = `${viewportOffsetX}px ${fragment.textBounds.y - fragment.y}px`;
        }
      }
    }
    paintSignalFlow(orchestrator) {
      const canvas = this.signalCanvas;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const width = Math.round(this.surfaceWidth * dpr);
      const height = Math.round(this.surfaceHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const drawingContext = canvas.getContext("2d");
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawingContext.clearRect(0, 0, this.surfaceWidth, this.surfaceHeight);
      if (!orchestrator.started || orchestrator.returningCrew) {
        this.signalLinks.clear();
        return;
      }
      const active = new Set();
      for (const candidate of orchestrator.robots) {
        if (candidate.destroyed) continue;
        const fragment = candidate.assignment && candidate.assignment.spec.it;
        if (!fragment || active.size >= 6) continue;
        const point = orchestrator.robotScreenPosition(candidate);
        const box = orchestrator.fragmentRectangle(fragment);
        const flowPoint = {
          x:
            box.x +
            box.w / 2 +
            (fragment.layer === "world" ? orchestrator.viewportState.ox - orchestrator.viewportState.sx : 0),
          y:
            box.y +
            box.h / 2 +
            (fragment.layer === "world" ? orchestrator.viewportState.oy - orchestrator.viewportState.sy : 0),
        };
        const distance = Math.hypot(flowPoint.x - point.x, flowPoint.y - point.y);
        if (distance < 24 || distance > 500) continue;
        active.add(candidate.id);
        const old = this.signalLinks.get(candidate.id);
        this.signalLinks.set(candidate.id, {
          p: point,
          q: flowPoint,
          color: candidate.color,
          at: orchestrator.time,
          born: old && old.assignment === candidate.assignment ? old.born : orchestrator.time,
          assignment: candidate.assignment,
        });
      }
      drawingContext.lineCap = "square";
      for (const [identity, link] of this.signalLinks) {
        const age = orchestrator.time - link.at;
        if (age > 0.22) {
          this.signalLinks.delete(identity);
          continue;
        }
        const alpha = Math.min(1, (orchestrator.time - link.born) / 0.12) * Math.max(0, 1 - age / 0.22);
        const { p: point, q: flowPoint } = link;
        const horizontalDelta = flowPoint.x - point.x;
        const verticalDelta = flowPoint.y - point.y;
        const distance = Math.hypot(horizontalDelta, verticalDelta);
        const nx = -verticalDelta / distance;
        const ny = horizontalDelta / distance;
        const edge = link.color === "#fff" ? "#000" : "#fff";
        const beat = Math.floor(orchestrator.time * 18 + identity * 7);
        const noise = (quantity) => {
          const record = Math.sin((beat * 31 + quantity * 127 + identity * 53) * 12.9898) * 43758.5453;
          return record - Math.floor(record);
        };
        for (let indexValue = 0; indexValue < 9; indexValue++) {
          const flicker = Math.sin(
            orchestrator.time * (25 + indexValue * 3) + identity * 11 + indexValue * 4.7,
          );
          if (flicker < 0.25) continue;
          const phaseValue = noise(indexValue) * 0.9 + 0.05;
          const length = 3 + noise(indexValue + 20) * Math.min(24, distance * 0.12);
          const x = point.x + horizontalDelta * phaseValue;
          const y = point.y + verticalDelta * phaseValue;
          const offset = (noise(indexValue + 40) - 0.5) * 10;
          const firstValue = alpha * (0.18 + noise(indexValue + 60) * 0.36) * flicker;
          drawingContext.globalAlpha = firstValue * 0.45;
          drawingContext.strokeStyle = edge;
          drawingContext.lineWidth = 2;
          drawingContext.beginPath();
          drawingContext.moveTo(x + nx * offset + 2, y + ny * offset - 1);
          drawingContext.lineTo(x + nx * (offset + length) + 2, y + ny * (offset + length) - 1);
          drawingContext.stroke();
          drawingContext.globalAlpha = firstValue;
          drawingContext.strokeStyle = link.color;
          drawingContext.lineWidth = 1;
          drawingContext.beginPath();
          drawingContext.moveTo(x + nx * offset, y + ny * offset);
          drawingContext.lineTo(x + nx * (offset + length), y + ny * (offset + length));
          drawingContext.stroke();
        }
      }
      drawingContext.globalAlpha = 1;
    }
    paintRobots(orchestrator) {
      const viewportState = orchestrator.viewportState;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const seen = new Set();
      for (const candidate of orchestrator.robots) {
        if (candidate.destroyed) continue;
        let element = this.robotNodes.get(candidate.id);
        if (!element) {
          element = document.createElement("div");
          element.className = "cursor";
          element.innerHTML = '<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"></svg>';
          element.style.setProperty("--phase", `${-candidate.id * 0.37}s`);
          this.robotLayer.appendChild(element);
          this.robotNodes.set(candidate.id, element);
          element._shape = "";
        }
        seen.add(candidate.id);
        const toScreenX = candidate.viewportAnchored
          ? candidate.x
          : candidate.x - viewportState.sx + viewportState.ox;
        const toScreenY = candidate.viewportAnchored
          ? candidate.y
          : candidate.y - viewportState.sy + viewportState.oy;
        element.style.transform = `translate(${pixelDecimal(toScreenX)}px,${pixelDecimal(toScreenY)}px)`;
        let visibility =
          candidate.launchRobot && (!orchestrator.started || candidate.launchTravel)
            ? orchestrator.started
              ? limitRange(
                  (Math.hypot(
                    candidate.x - candidate.launchOrigin.x,
                    candidate.y - candidate.launchOrigin.y,
                  ) -
                    12) /
                    96,
                  0,
                  1,
                )
              : 0
            : 1;
        if (candidate.summonedAt != null)
          visibility *= limitRange((orchestrator.time - candidate.summonedAt) / 0.22, 0, 1);
        const returning = orchestrator.started && (candidate.recalling || orchestrator.returningCrew);
        const target = orchestrator.mouse || {
          x: viewportState.ox + viewportState.vw / 2,
          y: viewportState.oy + viewportState.vh / 2,
        };
        const distance = Math.hypot(toScreenX - target.x, toScreenY - target.y);
        if (returning) visibility *= limitRange(distance / 32, 0, 1);
        element.style.opacity = String(visibility * visibility * (3 - 2 * visibility));
        element.dataset.state = returning
          ? "return"
          : candidate.recovering
            ? "error"
            : candidate.assignment
              ? candidate.pose === "ibeam"
                ? "type"
                : "work"
              : "fly";
        const svg = element.firstChild;
        const appearance = `${candidate.pose}:${candidate.color}:${candidate.bodyDesign}`;
        if (element._shape !== appearance) {
          svg.innerHTML = composeRobotGlyph(candidate.pose, candidate.color, candidate.bodyDesign);
          element._shape = appearance;
          element._body = svg.querySelector(".robot-body");
          svg.style.transformOrigin = "5px 37px";
        }
        const bob = reduced
          ? 0
          : Math.sin(orchestrator.time * (candidate.assignment ? 5 : 7) + candidate.id * 1.7) *
            (candidate.assignment ? 0.4 : 1.8);
        const lean =
          reduced || candidate.recovering
            ? 0
            : limitRange((toScreenX - (element._lastX ?? toScreenX)) * 0.7, -12, 12);
        element._lastX = toScreenX;
        element._body.style.transform = `translateY(${pixelDecimal(bob)}px) rotate(${pixelDecimal(lean)}deg)`;
        const scale =
          (1 - candidate.pressAmount * 0.06) * (returning ? limitRange(distance / 70, 0.08, 1) : 1);
        svg.style.transform = `translate(-5px,-37px) scale(${scale})`;
      }
      for (const [identity, element] of this.robotNodes)
        if (!seen.has(identity)) {
          element.remove();
          this.robotNodes.delete(identity);
        }
    }
    paintMeasurements(orchestrator) {
      const viewportState = orchestrator.viewportState;
      const surfaceWidth = this.surfaceWidth;
      const surfaceHeight = this.surfaceHeight;
      const toScreenX = (x, screenSpace) =>
        pixelDecimal(screenSpace ? x : x - viewportState.sx + viewportState.ox);
      const toScreenY = (y, screenSpace) =>
        pixelDecimal(screenSpace ? y : y - viewportState.sy + viewportState.oy);
      let markup = "";
      let secondValue = "";
      for (const alignmentGuide of orchestrator.alignmentGuides) {
        if (!alignmentGuide.isVisible || alignmentGuide.op <= 0) continue;
        const sw = 1 + alignmentGuide.flash;
        const color = alignmentGuide.axis === "x" ? AXIS_VIOLET : AXIS_LIME;
        const glowStyle =
          alignmentGuide.flash > 0
            ? ` style="filter:drop-shadow(0 0 ${pixelDecimal(2 + alignmentGuide.flash * 3)}px ${color})"`
            : "";
        if (alignmentGuide.axis === "x") {
          const x = toScreenX(alignmentGuide.cur);
          markup += `<line x1="${x}" x2="${x}" y1="0" y2="${surfaceHeight}" stroke="${color}" stroke-width="${sw}" opacity="${pixelDecimal(alignmentGuide.op)}"${glowStyle}/>`;
        } else {
          const y = toScreenY(alignmentGuide.cur);
          markup += `<line x1="0" x2="${surfaceWidth}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="${sw}" opacity="${pixelDecimal(alignmentGuide.op)}"${glowStyle}/>`;
        }
      }
      for (const widthValue of orchestrator.repairWarnings)
        secondValue += `<div class="badge warning" style="left:${pixelDecimal(widthValue.x)}px;top:${pixelDecimal(widthValue.y - 28)}px">ALIGN ERROR / RETRY</div>`;
      for (const fragment of orchestrator.activeVectors) {
        const screenSpace = fragment.layer !== "world";
        const pts = fragment.pts
          .slice(0, fragment.placed)
          .map((point) => [
            toScreenX(point.x + fragment.dx, screenSpace),
            toScreenY(point.y + fragment.dy, screenSpace),
          ]);
        const travelOptions = fragment.owner;
        const all = travelOptions
          ? [
              ...pts,
              [
                toScreenX(travelOptions.x, travelOptions.viewportAnchored),
                toScreenY(travelOptions.y, travelOptions.viewportAnchored),
              ],
            ]
          : pts;
        markup += `<polyline points="${all.map((point) => point.join(",")).join(" ")}${fragment.shut && pts[0] ? " " + pts[0].join(",") : ""}" fill="none" stroke="${AXIS_VIOLET}" stroke-width="1.5"/>`;
        for (const point of pts)
          markup += `<circle cx="${point[0]}" cy="${point[1]}" r="3.6" fill="#fff" stroke="${AXIS_VIOLET}" stroke-width="1.5"/>`;
      }
      const rulerVisibility = orchestrator.rulers.t;
      for (const candidate of orchestrator.robots) {
        if (!candidate.vectorOverlay) continue;
        const screenSpace = candidate.viewportAnchored;
        for (const record of candidate.vectorOverlay()) {
          if (record.t === "box") {
            const x = toScreenX(record.b.x, screenSpace);
            const y = toScreenY(record.b.y, screenSpace);
            const widthValue = pixelDecimal(record.b.w);
            const heightValue = pixelDecimal(record.b.h);
            const col = record.color === "red" ? AXIS_LIME : AXIS_VIOLET;
            markup += `<rect x="${x}" y="${y}" width="${widthValue}" height="${heightValue}" fill="none" stroke="${col}" stroke-width="1"/>`;
            if (record.textBaseline && record.textBaseline.w > 0) {
              const segment = record.textBaseline;
              markup += `<line x1="${toScreenX(segment.x, screenSpace)}" x2="${toScreenX(segment.x + segment.w, screenSpace)}" y1="${toScreenY(segment.y, screenSpace)}" y2="${toScreenY(segment.y, screenSpace)}" stroke="${AXIS_VIOLET}" stroke-width="1.5"/>`;
            }
            if (record.rulerLines && rulerVisibility > 0.05)
              markup += `<g stroke-width="1" stroke-dasharray="2 2" opacity="${pixelDecimal(rulerVisibility)}"><line x1="${RULER_THICKNESS}" x2="${x}" y1="${pixelDecimal(y + heightValue / 2)}" y2="${pixelDecimal(y + heightValue / 2)}" stroke="${AXIS_LIME}"/><line x1="${pixelDecimal(x + widthValue / 2)}" x2="${pixelDecimal(x + widthValue / 2)}" y1="${RULER_THICKNESS}" y2="${y}" stroke="${AXIS_VIOLET}"/></g>`;
            if (record.handles)
              for (const [handleX, handleY] of [
                [x, y],
                [x + widthValue, y],
                [x, y + heightValue],
                [x + widthValue, y + heightValue],
              ])
                markup += `<rect x="${pixelDecimal(handleX - 3.5)}" y="${pixelDecimal(handleY - 3.5)}" width="7" height="7" fill="#fff" stroke="${col}" stroke-width="1"/>`;
            if (record.badge && widthValue > 0)
              secondValue += `<div class="badge" style="left:${pixelDecimal(x + widthValue / 2)}px;top:${pixelDecimal(y + heightValue + 8)}px;background:${col};color:${col === AXIS_LIME ? "#111" : "#fff"}">${record.badge}</div>`;
          } else if (record.t === "measure") {
            const firstValue = {
              x: toScreenX(record.a.x, screenSpace),
              y: toScreenY(record.a.y, screenSpace),
            };
            const destinationPoint = {
              x: toScreenX(record.b.x, screenSpace),
              y: toScreenY(record.b.y, screenSpace),
            };
            markup += `<line x1="${firstValue.x}" y1="${firstValue.y}" x2="${destinationPoint.x}" y2="${destinationPoint.y}" stroke="${AXIS_LIME}" stroke-width="1"/>`;
            const horiz = firstValue.y === destinationPoint.y;
            secondValue += `<div class="badge" style="left:${pixelDecimal(horiz ? (firstValue.x + destinationPoint.x) / 2 : firstValue.x + 18)}px;top:${pixelDecimal(horiz ? firstValue.y + 8 : (firstValue.y + destinationPoint.y) / 2 - 9)}px;background:${AXIS_LIME};color:#111">${record.label}</div>`;
          }
        }
      }
      if (markup !== this.lastVectorMarkup) {
        this.vectorOverlay.innerHTML = markup;
        this.lastVectorMarkup = markup;
      }
      if (secondValue !== this.lastMetricMarkup) {
        this.metricLabels.innerHTML = secondValue;
        this.lastMetricMarkup = secondValue;
      }
    }
    paintBlasts(orchestrator) {
      const active = new Set();
      for (const burst of orchestrator.activeBlasts) {
        active.add(burst.id);
        if (this.blastNodes.has(burst.id)) continue;
        const imageElement = document.createElement("img");
        imageElement.className = "explosion";
        imageElement.alt = "";
        imageElement.src = this.blastAssetAddress + "?burst=" + burst.id + "-" + performance.now();
        imageElement.style.left = burst.x + "px";
        imageElement.style.top = burst.y + "px";
        this.blastLayer.appendChild(imageElement);
        this.blastNodes.set(burst.id, imageElement);
      }
      for (const [identity, imageElement] of this.blastNodes) {
        if (active.has(identity)) continue;
        imageElement.remove();
        this.blastNodes.delete(identity);
      }
    }
    paintRulers(orchestrator) {
      const phaseValue = orchestrator.rulers.t;
      if (phaseValue <= 0.001) {
        if (this.rulersMounted) {
          this.rulers.innerHTML = "";
          this.rulersMounted = false;
        }
        return;
      }
      this.rulersMounted = true;
      const viewportState = orchestrator.viewportState;
      const surfaceWidth = this.surfaceWidth;
      const surfaceHeight = this.surfaceHeight;
      const step = 100;
      let segment = "";
      let firstValue = "";
      const firstTickX = Math.floor((viewportState.sx - viewportState.ox) / step) * step;
      for (
        let candidate = firstTickX;
        candidate - viewportState.sx + viewportState.ox < surfaceWidth;
        candidate += step / 2
      ) {
        const x = pixelDecimal(candidate - viewportState.sx + viewportState.ox);
        const major = candidate % step === 0;
        segment += `<line x1="${x}" x2="${x}" y1="${major ? 13 : 16}" y2="${RULER_THICKNESS}" stroke="${AXIS_VIOLET}" opacity="${major ? 1 : 0.45}"/>`;
        if (major) segment += `<text x="${pixelDecimal(x + 3)}" y="11" class="rtext">${candidate}</text>`;
      }
      const firstTickY = Math.floor((viewportState.sy - viewportState.oy) / step) * step;
      for (
        let candidate = firstTickY;
        candidate - viewportState.sy + viewportState.oy < surfaceHeight;
        candidate += step / 2
      ) {
        const y = pixelDecimal(candidate - viewportState.sy + viewportState.oy);
        const major = candidate % step === 0;
        firstValue += `<line y1="${y}" y2="${y}" x1="${major ? 13 : 16}" x2="${RULER_THICKNESS}" stroke="${AXIS_LIME}" opacity="${major ? 1 : 0.45}"/>`;
        if (major)
          firstValue += `<text x="11" y="${pixelDecimal(y - 3)}" class="rtext" transform="rotate(-90 11 ${pixelDecimal(y - 3)})">${candidate}</text>`;
      }
      for (const candidate of orchestrator.robots) {
        if (!candidate.vectorOverlay || candidate.viewportAnchored) continue;
        for (const record of candidate.vectorOverlay()) {
          if (record.t !== "box" || !record.handles) continue;
          const leftEdge = pixelDecimal(record.b.x - viewportState.sx + viewportState.ox);
          const rectangle = pixelDecimal(record.b.x + record.b.w - viewportState.sx + viewportState.ox);
          const topPosition = pixelDecimal(record.b.y - viewportState.sy + viewportState.oy);
          const bottomEdge = pixelDecimal(record.b.y + record.b.h - viewportState.sy + viewportState.oy);
          segment =
            `<rect x="${leftEdge}" y="0" width="${pixelDecimal(rectangle - leftEdge)}" height="${RULER_THICKNESS}" fill="rgba(136,79,254,0.22)"/>` +
            segment +
            `<text x="${pixelDecimal(leftEdge + 3)}" y="11" class="rtext rsel">${Math.round(record.b.x)}</text>`;
          firstValue =
            `<rect y="${topPosition}" x="0" height="${pixelDecimal(bottomEdge - topPosition)}" width="${RULER_THICKNESS}" fill="rgba(132,255,0,0.22)"/>` +
            firstValue;
        }
      }
      for (const alignmentGuide of orchestrator.alignmentGuides) {
        if (!alignmentGuide.dragging) continue;
        if (alignmentGuide.axis === "x") {
          const x = pixelDecimal(alignmentGuide.cur - viewportState.sx + viewportState.ox);
          segment += `<line x1="${x}" x2="${x}" y1="0" y2="${RULER_THICKNESS}" stroke="${AXIS_VIOLET}"/><text x="${pixelDecimal(x + 4)}" y="11" class="rtext" fill="${AXIS_VIOLET}" style="fill:${AXIS_VIOLET}">${Math.round(alignmentGuide.cur)}</text>`;
        } else {
          const y = pixelDecimal(alignmentGuide.cur - viewportState.sy + viewportState.oy);
          firstValue += `<line y1="${y}" y2="${y}" x1="0" x2="${RULER_THICKNESS}" stroke="${AXIS_LIME}"/>`;
        }
      }
      this.rulers.innerHTML =
        `<div class="ruler ruler-top" style="transform:translateY(${pixelDecimal((phaseValue - 1) * 100)}%)"><svg width="${surfaceWidth}" height="${RULER_THICKNESS}">${segment}</svg></div>` +
        `<div class="ruler ruler-left" style="transform:translateX(${pixelDecimal((phaseValue - 1) * 100)}%)"><svg width="${RULER_THICKNESS}" height="${surfaceHeight}">${firstValue}</svg></div>` +
        `<div class="ruler-corner" style="opacity:${pixelDecimal(phaseValue)}"></div>`;
    }
    paintFrame(orchestrator) {
      this.syncDocumentPosition();
      if (this.backdropPanels && this.backdropPanels.length) {
        const travelOptions = pixelDecimal(
          limitRange((Math.abs(orchestrator.viewportState.sy - this.backdropScrollOrigin) - 8) / 80, 0, 1),
        );
        if (travelOptions !== this.backdropOpacity) {
          this.backdropOpacity = travelOptions;
          for (const nodeValue of this.backdropPanels) nodeValue.style.opacity = travelOptions;
        }
      }
      if (orchestrator.fragments) for (const fragment of orchestrator.fragments) this.paintFragment(fragment);
      this.paintMeasurements(orchestrator);
      this.paintSignalFlow(orchestrator);
      this.paintRobots(orchestrator);
      this.paintBlasts(orchestrator);
      this.paintRulers(orchestrator);
    }
  }
  /* Assign work by role, repair failed regions, and recall each robot when the queue drains.*/
  class RobotOrchestrator {
    constructor(view) {
      this.surface = view;
      this.viewportState = view.viewportState;
      this.fragments = null;
      this.jobs = [];
      this.repeatedComponents = [];
      this.alignmentGuides = [];
      this.activeVectors = new Set();
      this.robots = [];
      this.started = false;
      this.isReady = false;
      this.unlockedBottom = 0;
      this.scrollMomentum = 0;
      this.workPace = 1;
      this.speed = 1;
      this.time = 0;
      this.rulers = {
        want: 0,
        t: 0,
        lastNeed: -10,
      };
      this.previousScrollY = null;
      this.nextRobotIdentity = 0;
      this.recruitDelay = 0;
      this.returningCrew = false;
      this.previousClock = null;
      this.viewportSample = {
        x: 0,
        y: 0,
      };
      this.mouse = window.__smartRobotPointer || null;
      this.retiredRobots = 0;
      this.finishedJobs = 0;
      this.queuedJobs = 0;
      this.failedJobs = 0;
      this.repairWarnings = [];
      this.activeBlasts = [];
      const viewportState = this.viewportState;
      const origin = this.mouse
        ? this.toDocumentPosition(this.mouse.x, this.mouse.y)
        : this.toDocumentPosition(
            viewportState.ox + viewportState.vw / 2,
            viewportState.oy + viewportState.vh / 2,
          );
      const introColors = [[], []];
      for (let quantity = 0; quantity < LAUNCH_CREW_SIZE; quantity++)
        introColors[quantity % 2].push(
          MONOCHROME_PALETTE[Math.floor(quantity / 2) % MONOCHROME_PALETTE.length],
        );
      for (const colors of introColors) {
        for (let indexValue = colors.length - 1; indexValue > 0; indexValue--) {
          const j = Math.floor(Math.random() * (indexValue + 1));
          [colors[indexValue], colors[j]] = [colors[j], colors[indexValue]];
        }
      }
      for (let quantity = 0; quantity < LAUNCH_CREW_SIZE; quantity++) {
        const side = quantity % 2 === 0;
        const point = this.toDocumentPosition(
          side
            ? viewportState.ox + sampleRange(36, viewportState.vw * 0.18)
            : viewportState.ox + sampleRange(viewportState.vw * 0.82, viewportState.vw - 36),
          viewportState.oy + sampleRange(36, viewportState.vh - 36),
        );
        const robot = this.createRobot(origin.x, origin.y, quantity < CREW_MINIMUM);
        robot.color = introColors[quantity % 2].pop();
        robot.launchRobot = true;
        robot.launchOrigin = origin;
        robot.launchDestination = point;
        robot.recalling = true;
        robot.launchTravel = true;
        robot.routine = this.travelTo(robot, point, {
          playOpeningCue: true,
          drag: true,
          speed: sampleRange(0.9, 1.15),
          bend: sampleRange(-0.25, 0.25),
        });
        robot.routine.next();
        this.robots.push(robot);
      }
    }
    get visibleTop() {
      return this.viewportState.sy;
    }
    get visibleBottom() {
      return this.viewportState.sy + this.viewportState.vh;
    }
    loadBlueprint(entry) {
      this.fragments = entry.fragments;
      this.jobs = entry.jobs;
      this.repeatedComponents = entry.repeatedComponents;
      this.alignmentGuides = entry.alignmentGuides;
      this.alignmentPrerequisites = new Map(
        entry.alignmentGuides.map((alignmentGuide) => [alignmentGuide, alignmentGuide.deps || []]),
      );
      this.queuedJobs = entry.jobs.length;
      this.failureJobs = this.chooseFailureJobs();
      for (const phaseValue of this.failureJobs) phaseValue.spec.it.repairPending = true;
      for (const fragment of this.fragments) {
        for (let parent = fragment.parentPanel; parent; parent = parent.parentPanel) {
          if (!parent.repairPending) continue;
          fragment.repairAncestor = parent;
          break;
        }
      }
      const largestArea = this.fragments.reduce(
        (area, fragment) =>
          Math.max(area, ["rect", "image"].includes(fragment.kind) ? fragment.w * fragment.h : 0),
        0,
      );
      const largestBlocks = new Set(
        this.fragments.filter(
          (fragment) => ["rect", "image"].includes(fragment.kind) && fragment.w * fragment.h === largestArea,
        ),
      );
      for (const phaseValue of this.jobs) {
        phaseValue.engineerRole =
          !!phaseValue.animated ||
          largestBlocks.has(phaseValue.spec.it) ||
          (phaseValue.spec.type === "dup" &&
            phaseValue.spec.g.dst[phaseValue.spec.k].fragments.some((fragment) =>
              largestBlocks.has(fragment),
            ));
      }
      const movable = this.jobs.filter((phaseValue) => {
        const fragment = phaseValue.spec.it;
        return (
          !phaseValue.animated &&
          ["rect", "image"].includes(phaseValue.spec.type) &&
          !this.failureJobs.has(phaseValue) &&
          !fragment.repairAncestor &&
          !fragment.group &&
          fragment.w * fragment.h < largestArea &&
          fragment.w >= 40 &&
          fragment.h >= 24 &&
          fragment.w < this.viewportState.vw * 0.4 &&
          fragment.h < this.viewportState.vh * 0.35
        );
      });
      for (let quantity = 0; quantity < 3 && movable.length; quantity++) {
        const phaseValue = movable.splice(Math.floor(Math.random() * movable.length), 1)[0];
        phaseValue.spec.it.relocationPending = true;
        phaseValue.engineerRole = true;
      }
      this.isReady = true;
    }
    chooseFailureJobs() {
      const { vw: viewportWidth, vh: viewportHeight } = this.viewportState;
      const blocks = this.jobs.filter(
        (phaseValue) => !phaseValue.animated && ["rect", "image"].includes(phaseValue.spec.type),
      );
      const largestArea = blocks.reduce(
        (area, phaseValue) => Math.max(area, phaseValue.spec.it.w * phaseValue.spec.it.h),
        0,
      );
      const candidates = blocks.filter((phaseValue) => {
        const fragment = phaseValue.spec.it;
        return (
          fragment.w * fragment.h < largestArea &&
          fragment.w >= 24 &&
          fragment.h >= 16 &&
          fragment.w * fragment.h <= viewportWidth * viewportHeight * 0.65
        );
      });
      const points = candidates
        .filter(
          (ignoredError, indexValue) => indexValue % Math.max(1, Math.ceil(candidates.length / 80)) === 0,
        )
        .map((task) => {
          const fragment = task.spec.it;
          return {
            assignment: task,
            x: fragment.x + fragment.w / 2,
            y: fragment.y + fragment.h / 2,
          };
        });
      const separate = (firstValue, secondValue) =>
        Math.abs(firstValue.x - secondValue.x) >= Math.min(96, viewportWidth * 0.12) &&
        Math.abs(firstValue.y - secondValue.y) >= Math.min(64, viewportHeight * 0.12);
      let best = points.slice(0, 1);
      let score = -1;
      for (const seed of points) {
        const chosen = [seed];
        let spread = Infinity;
        while (chosen.length < 5) {
          let next = null;
          let distance = -1;
          for (const point of points) {
            if (!chosen.every((flowPoint) => separate(point, flowPoint))) continue;
            const gap = Math.min(
              ...chosen.map((flowPoint) =>
                Math.hypot((point.x - flowPoint.x) / viewportWidth, (point.y - flowPoint.y) / viewportHeight),
              ),
            );
            if (gap > distance) {
              next = point;
              distance = gap;
            }
          }
          if (!next) break;
          chosen.push(next);
          spread = Math.min(spread, distance);
        }
        if (chosen.length > best.length || (chosen.length === best.length && spread > score)) {
          best = chosen;
          score = spread;
        }
      }
      return new Set(best.map((point) => point.assignment));
    }
    createRobot(x, y, home = false) {
      const identity = this.nextRobotIdentity++;
      const fast = Math.random() < 0.25;
      return {
        id: identity,
        x,
        y,
        home,
        bodyDesign: Math.floor(Math.random() * 4),
        name: ROBOT_CALLSIGNS[identity % ROBOT_CALLSIGNS.length],
        color: MONOCHROME_PALETTE[identity % MONOCHROME_PALETTE.length],
        pose: "arrow",
        pressAmount: 0,
        assignment: null,
        routine: null,
        vectorOverlay: null,
        inactiveSeconds: 0,
        departing: false,
        hasWorked: false,
        viewportAnchored: false,
        vx: 0,
        vy: 0,
        angle: 0,
        speed: fast ? sampleRange(1000, 1500) : sampleRange(300, 750),
        force: fast ? sampleRange(3500, 6000) : sampleRange(700, 1800),
        spin: fast ? sampleRange(2.2, 3.4) : sampleRange(0.8, 1.8),
        curl: sampleRange(-1, 1),
        orbit: sampleRange(70, 170),
        recalling: false,
      };
    }
    toDocumentPosition(x, y) {
      const viewportState = this.viewportState;
      return {
        x: x - viewportState.ox + viewportState.sx,
        y: y - viewportState.oy + viewportState.sy,
      };
    }
    jobVerticalPosition(phaseValue) {
      return phaseValue.layer === "world" ? phaseValue.y : this.visibleTop + phaseValue.y;
    }
    robotScreenPosition(robot) {
      const viewportState = this.viewportState;
      return robot.viewportAnchored
        ? {
            x: robot.x,
            y: robot.y,
          }
        : {
            x: robot.x - viewportState.sx + viewportState.ox,
            y: robot.y - viewportState.sy + viewportState.oy,
          };
    }
    playPlacementCue(kind, fragment, secondValue) {
      if (!this.audioRack) return;
      const viewportState = this.viewportState;
      secondValue = secondValue || this.fragmentRectangle(fragment);
      let x = secondValue.x + secondValue.w / 2;
      let y = secondValue.y + secondValue.h / 2;
      if (!fragment || fragment.layer === "world") {
        x += viewportState.ox - viewportState.sx;
        y += viewportState.oy - viewportState.sy;
      }
      this.audioRack.playPlacement(
        kind,
        x,
        y,
        secondValue.w,
        secondValue.h,
        viewportState.vw,
        viewportState.vh,
        (fragment && fragment.fs) || 0,
      );
    }
    begin() {
      if (this.started || !this.isReady) return;
      this.started = true;
      this.startedAt = this.time;
      this.mouse = window.__smartRobotPointer || this.mouse;
      const origin = this.recallAnchor();
      for (const robot of this.robots) {
        if (robot.launchTravel) {
          robot.x = origin.x;
          robot.y = origin.y;
          robot.launchOrigin = origin;
          robot.routine = this.travelTo(robot, robot.launchDestination, {
            playOpeningCue: true,
            drag: true,
            speed: sampleRange(0.9, 1.15),
            bend: sampleRange(-0.25, 0.25),
          });
          robot.routine.next();
        }
        robot.recalling = false;
        robot.angle = ((((robot.angle + 180) % 360) + 360) % 360) - 180;
      }
      if (this.audioRack) this.audioRack.begin();
      if (this.afterLaunch) this.afterLaunch();
    }
    fragmentRectangle(fragment) {
      if (fragment.kind === "text") {
        let heightValue = fragment.textBounds.h;
        if (fragment.typingActive && !fragment.allGlyphsSelected && fragment.glyphCount) {
          const lines = Math.max(1, Math.round(fragment.textBounds.h / fragment.lineHeightValue));
          heightValue = Math.min(
            fragment.textBounds.h,
            Math.max(
              fragment.lineHeightValue,
              Math.ceil((fragment.visibleGlyphCount / fragment.glyphCount) * lines) *
                fragment.lineHeightValue,
            ),
          );
        }
        const markup = fragment.scale;
        const anchorX =
          fragment.align === "center"
            ? (fragment.textBounds.w * (1 - markup)) / 2
            : fragment.align === "right" || fragment.align === "end"
              ? fragment.textBounds.w * (1 - markup)
              : 0;
        return {
          x: fragment.textBounds.x + fragment.dx + anchorX,
          y: fragment.textBounds.y + fragment.dy,
          w: fragment.textBounds.w * markup,
          h: heightValue * markup,
        };
      }
      if (fragment.kind === "line") {
        return {
          x: fragment.x + fragment.dx,
          y: fragment.y + fragment.dy,
          w: fragment.w,
          h: fragment.h,
        };
      }
      return {
        x: fragment.x + fragment.dx,
        y: fragment.y + fragment.dy,
        w: fragment.draw ? fragment.draw.w : fragment.w,
        h: fragment.draw ? fragment.draw.h : fragment.h,
      };
    }
    combinedRectangle(list) {
      const bodyAppearance = list.map((fragment) => this.fragmentRectangle(fragment));
      const x = Math.min(...bodyAppearance.map((secondValue) => secondValue.x));
      const y = Math.min(...bodyAppearance.map((secondValue) => secondValue.y));
      return {
        x,
        y,
        w: Math.max(...bodyAppearance.map((secondValue) => secondValue.x + secondValue.w)) - x,
        h: Math.max(...bodyAppearance.map((secondValue) => secondValue.y + secondValue.h)) - y,
      };
    }
    textBaseline(fragment, secondValue) {
      return {
        x: secondValue.x,
        y: secondValue.y + (fragment.lineHeightValue * 0.5 + fragment.fs * 0.42) * fragment.scale,
        w: Math.min(secondValue.w, fragment.textBounds.w * fragment.scale),
        h: 0,
      };
    }
    selectionVisual(fragment, extra) {
      const secondValue = this.fragmentRectangle(fragment);
      return Object.assign(
        {
          t: "box",
          b: secondValue,
          handles: true,
          badge: `${Math.round(secondValue.w)} × ${Math.round(secondValue.h)}`,
          rulerLines: true,
          textBaseline: fragment.kind === "text" ? this.textBaseline(fragment, secondValue) : undefined,
        },
        extra,
      );
    }
    collectReadyJobs() {
      const out = [];
      const ordinaryPending = this.jobs.some(
        (phaseValue) =>
          !phaseValue.animated &&
          phaseValue.state !== "done" &&
          (phaseValue.layer !== "world" || phaseValue.gate <= this.unlockedBottom),
      );
      for (const phaseValue of this.jobs) {
        if (phaseValue.state !== "wait") continue;
        const members = phaseValue.spec.it
          ? [phaseValue.spec.it]
          : phaseValue.spec.type === "dup"
            ? phaseValue.spec.g.dst[phaseValue.spec.k].fragments
            : [];
        if (
          members.some((fragment) => {
            for (let parent = fragment.parentPanel; parent; parent = parent.parentPanel)
              if (parent.repairPending || parent.relocationPending) return true;
            return false;
          })
        )
          continue;
        if (phaseValue.animated && ordinaryPending) continue;
        if (phaseValue.layer === "world" && phaseValue.gate > this.unlockedBottom) continue;
        let ok = true;
        for (const nodeValue of phaseValue.deps)
          if (nodeValue.state !== "done") {
            ok = false;
            break;
          }
        if (ok) out.push(phaseValue);
      }
      return out;
    }
    chooseJob(robot, list) {
      let best = null;
      let bestS = Infinity;
      const top = this.visibleTop - 40;
      const bot = this.visibleBottom;
      const cy = robot.viewportAnchored ? robot.y + this.visibleTop : robot.y;
      for (const phaseValue of list) {
        if (!!phaseValue.engineerRole !== !!robot.engineerRole) continue;
        const y = this.jobVerticalPosition(phaseValue);
        const segment = y >= top && y <= bot ? 0 : y < top ? 1 : 2;
        const markup =
          segment * 1e6 +
          (segment === 1 ? top - y : y) * 0.6 +
          Math.abs(y - cy) * 0.4 -
          (phaseValue.spec.type === "guide" ? 5e5 : 0);
        if (markup < bestS) {
          bestS = markup;
          best = phaseValue;
        }
      }
      return best;
    }
    assignJob(robot, job) {
      if (!robot.engineerRole) robot.standardTint = robot.color;
      robot.engineerRole = !!job.engineerRole;
      robot.color = robot.engineerRole ? ENGINEER_TINT : robot.standardTint;
      job.state = "active";
      this.queuedJobs--;
      robot.assignment = job;
      robot.routine = null;
      robot.hasWorked = true;
      robot.inactiveSeconds = 0;
      if (job.layer !== "world") {
        robot.viewportAnchored = true;
        robot.x += this.viewportState.ox - this.viewportState.sx;
        robot.y += this.viewportState.oy - this.viewportState.sy;
      }
      robot.routine = this.execute(robot, job);
    }
    unfinishedJobCount() {
      let quantity = 0;
      for (const phaseValue of this.jobs)
        if (
          phaseValue.state !== "done" &&
          (phaseValue.layer !== "world" || phaseValue.gate <= this.unlockedBottom)
        )
          quantity++;
      return quantity;
    }
    hasQueuedWork() {
      return this.jobs.some(
        (phaseValue) =>
          phaseValue.state === "wait" &&
          (this.includeOffscreenWork ||
            phaseValue.layer !== "world" ||
            phaseValue.gate <= this.unlockedBottom),
      );
    }
    releaseEngineer(robot) {
      if (!this.hasQueuedWork()) {
        robot.recalling = true;
        robot.routine = null;
        robot.vectorOverlay = null;
        robot.departing = false;
        robot.recallRate = sampleRange(6, 12);
        return;
      }
      const point = this.robotScreenPosition(robot);
      this.activeBlasts.push({
        x: point.x + 19,
        y: point.y - 17,
        color: robot.color,
        id: robot.id,
        at: this.time,
      });
      if (this.audioRack) this.audioRack.playBlastCue(point.x, this.viewportState.vw);
      if (robot.hasWorked) this.retiredRobots++;
      this.robots.splice(this.robots.indexOf(robot), 1);
    }
    advanceSimulation(dt) {
      dt = Math.min(dt, 0.05);
      this.time += dt;
      this.repairWarnings = this.repairWarnings.filter((widthValue) => widthValue.until > this.time);
      this.activeBlasts = this.activeBlasts.filter((secondValue) => this.time - secondValue.at < 1);
      const viewportState = (this.viewportState = this.surface.viewportState);
      const scrollVelocity =
        Math.abs(
          viewportState.sy - (this.previousScrollY == null ? viewportState.sy : this.previousScrollY),
        ) / Math.max(dt, 0.001);
      this.previousScrollY = viewportState.sy;
      this.scrollMomentum = Math.max(
        this.scrollMomentum * Math.exp(-dt * 1.2),
        this.scrollMomentum * 0.7 + scrollVelocity * 0.3,
      );
      if (this.started) this.unlockedBottom = Math.max(this.unlockedBottom, this.visibleBottom);
      const avail = this.started ? this.collectReadyJobs() : [];
      this.workPace =
        limitRange(
          2.1 + this.scrollMomentum / 900 + (avail.length / Math.max(1, this.robots.length)) * 0.5,
          2.1,
          4.5,
        ) * this.speed;
      if (this.rulers.want > 0) this.rulers.lastNeed = this.time;
      const rulerVisibility = this.time - this.rulers.lastNeed < 0.7 ? 1 : 0;
      this.rulers.t += (rulerVisibility - this.rulers.t) * Math.min(1, dt * 10);
      if (Math.abs(rulerVisibility - this.rulers.t) < 0.002) this.rulers.t = rulerVisibility;
      for (const alignmentGuide of this.alignmentGuides) {
        if (!alignmentGuide.isVisible) continue;
        if (alignmentGuide.flash > 0) alignmentGuide.flash = Math.max(0, alignmentGuide.flash - dt * 1.5);
        const deps = this.alignmentPrerequisites.get(alignmentGuide) || [];
        if (alignmentGuide.shownAt == null) alignmentGuide.shownAt = this.time;
        if (
          !alignmentGuide.dragging &&
          alignmentGuide.op > 0 &&
          this.time - alignmentGuide.shownAt > 7 &&
          !deps.some((phaseValue) => phaseValue.state === "active")
        )
          alignmentGuide.op = Math.max(0, alignmentGuide.op - dt * 1.2);
        else if (!alignmentGuide.dragging && deps.every((phaseValue) => phaseValue.state === "done")) {
          const last = Math.max(0, ...deps.map((phaseValue) => phaseValue.doneAt));
          if (this.time - last > 1.2 && alignmentGuide.op > 0)
            alignmentGuide.op = Math.max(0, alignmentGuide.op - dt * 1.2);
        }
      }
      if (this.started) {
        for (const robot of [...this.robots])
          if (robot.engineerRole && !robot.assignment && !robot.recalling && !this.chooseJob(robot, avail))
            this.releaseEngineer(robot);
      }
      if (!this.returningCrew && this.started && !this.hasQueuedWork()) {
        for (const robot of this.robots)
          if (!robot.assignment && !robot.recalling) {
            robot.recalling = true;
            robot.routine = null;
            robot.departing = false;
            robot.vectorOverlay = null;
            robot.pose = "arrow";
          }
        if (this.robots.every((robot) => robot.recalling)) {
          this.returningCrew = true;
          this.finishedAt = this.time;
          if (this.afterCompletion) this.afterCompletion();
        }
      }
      if (this.returningCrew) {
        this.recallCrew(dt);
        return;
      }
      if (!this.started) {
        return;
      }
      if (this.robots.some((robot) => robot.recalling))
        this.recallCrew(
          dt,
          this.robots.filter((robot) => robot.recalling),
        );
      this.recruitDelay -= dt;
      const want = limitRange(
        CREW_MINIMUM + Math.floor(this.scrollMomentum / 40) + Math.floor(avail.length / 2),
        CREW_MINIMUM,
        CREW_LIMIT,
      );
      const active = this.robots.filter((robot) => !robot.departing).length;
      const busy = this.robots.filter((robot) => robot.assignment).length;
      if (active < want && avail.length > active - busy && this.recruitDelay <= 0) {
        const left = Math.random() < 0.5;
        const point = this.toDocumentPosition(
          left ? viewportState.ox - 40 : viewportState.ox + viewportState.vw + 40,
          viewportState.oy + sampleRange(0.2, 0.8) * viewportState.vh,
        );
        this.robots.push(this.createRobot(point.x, point.y));
        this.recruitDelay = 0.035;
      }
      const specialistTasks = avail.filter((phaseValue) => phaseValue.engineerRole).length;
      const animationTasks = avail.filter((phaseValue) => phaseValue.spec.type === "animation-sweep");
      if (animationTasks.length) {
        const batch = {
          glyphCount: animationTasks.length,
          ready: 0,
          start: null,
        };
        for (const phaseValue of animationTasks) {
          phaseValue.revealBatch = batch;
          phaseValue.spec.it.revealFromRight = revealStartsAtRight(phaseValue.spec.it, viewportState);
        }
      }
      const specialists = this.robots.filter(
        (robot) => robot.engineerRole && !robot.assignment && !robot.recalling && !robot.departing,
      ).length;
      const needed = animationTasks.length + Math.min(CREW_MINIMUM, specialistTasks - animationTasks.length);
      for (let quantity = specialists; quantity < needed; quantity++) {
        const origin = this.recallAnchor();
        const robot = this.createRobot(origin.x, origin.y, true);
        robot.engineerRole = true;
        robot.color = ENGINEER_TINT;
        robot.bodyDesign = 0;
        robot.summonedAt = this.time;
        this.robots.push(robot);
      }
      for (const robot of this.robots) {
        if (robot.assignment || robot.departing || robot.recalling || robot.launchTravel) continue;
        const phaseValue = this.chooseJob(robot, avail);
        if (!phaseValue) continue;
        avail.splice(avail.indexOf(phaseValue), 1);
        this.assignJob(robot, phaseValue);
      }
      for (const robot of [...this.robots]) {
        if (robot.recalling) continue;
        robot.pressAmount = Math.max(0, robot.pressAmount - dt * 6);
        if (robot.angle !== 0)
          robot.angle = Math.abs(robot.angle) < 0.5 ? 0 : robot.angle * (1 - Math.min(1, dt * 10));
        if (!robot.assignment) {
          if (robot.engineerRole) {
            this.releaseEngineer(robot);
            continue;
          }
          robot.inactiveSeconds += dt;
          if (
            !robot.departing &&
            robot.inactiveSeconds > 2.5 &&
            this.robots.filter((entry) => !entry.departing).length > CREW_MINIMUM &&
            !robot.home
          ) {
            robot.departing = true;
            robot.routine = this.depart(robot);
          }
          if (!robot.routine) robot.routine = this.roam(robot);
        }
        if (robot.routine.next(dt).done) {
          const introFlight = robot.launchTravel;
          if (robot.assignment) {
            robot.assignment.state = "done";
            robot.assignment.doneAt = this.time;
            this.finishedJobs++;
            robot.assignment = null;
            robot.vectorOverlay = null;
            if (robot.viewportAnchored) {
              robot.viewportAnchored = false;
              robot.x -= viewportState.ox - viewportState.sx;
              robot.y -= viewportState.oy - viewportState.sy;
            }
            robot.pose = "arrow";
            avail.splice(0, avail.length, ...this.collectReadyJobs());
            const next = this.chooseJob(
              robot,
              avail.filter(
                (phaseValue) => phaseValue.spec.type !== "animation-sweep" || phaseValue.revealBatch,
              ),
            );
            if (next) {
              avail.splice(avail.indexOf(next), 1);
              this.assignJob(robot, next);
              continue;
            }
            if (robot.engineerRole) {
              this.releaseEngineer(robot);
              continue;
            }
            if (!this.hasQueuedWork()) {
              robot.recalling = true;
              robot.recallRate = sampleRange(6, 12);
              robot.departing = false;
            }
          }
          robot.routine = null;
          if (introFlight) {
            robot.launchTravel = false;
            continue;
          }
          if (robot.departing) {
            if (robot.hasWorked) this.retiredRobots++;
            this.robots.splice(this.robots.indexOf(robot), 1);
          }
        }
      }
    }
    *performRepair(robot, task) {
      robot.recovering = true;
      const fragment = task.spec.it;
      robot.pose = "cross";
      yield* this.travelTo(robot, {
        x: fragment.x,
        y: fragment.y,
      });
      robot.pressAmount = 1;
      const chars = "#%&@!?/\\<>01░▒▓ЖЯλψ";
      const count = Math.min(3000, Math.max(48, Math.ceil(fragment.w / 9) * Math.ceil(fragment.h / 15)));
      fragment.node.setAttribute(
        "data-garbage",
        Array.from(
          {
            length: count,
          },
          () => chars[Math.floor(Math.random() * chars.length)],
        ).join(""),
      );
      fragment.node.classList.remove("error-erase");
      fragment.isVisible = true;
      fragment.styled = false;
      fragment.draw = {
        w: 0,
        h: 0,
      };
      invalidateFragment(fragment);
      robot.vectorOverlay = () => [this.selectionVisual(fragment)];
      yield* this.travelTo(robot, this.clippedDragTarget(robot, fragment), {
        drag: true,
        speed: 0.75,
        bend: 0,
        onStep: () => {
          fragment.draw = {
            w: Math.max(0, robot.x - fragment.x),
            h: Math.max(0, robot.y - fragment.y),
          };
          invalidateFragment(fragment);
        },
      });
      fragment.draw = null;
      invalidateFragment(fragment);
      this.repairWarnings.push({
        ...this.robotScreenPosition(robot),
        until: this.time + 1.1,
      });
      if (this.audioRack)
        this.audioRack.playFailureCue(this.robotScreenPosition(robot).x, this.viewportState.vw);
      let elapsed = 0;
      while (elapsed < 0.75) elapsed += yield;
      robot.destroyed = true;
      const position = this.robotScreenPosition(robot);
      this.activeBlasts.push({
        x: position.x + 19,
        y: position.y - 17,
        color: robot.color,
        id: robot.id,
        at: this.time,
      });
      if (this.audioRack) this.audioRack.playBlastCue(position.x, this.viewportState.vw);
      fragment.node.classList.add("error-erase");
      elapsed = 0;
      while (elapsed < 1) elapsed += yield;
      fragment.node.classList.remove("error-erase");
      fragment.node.removeAttribute("data-garbage");
      fragment.isVisible = false;
      fragment.styled = false;
      fragment.draw = null;
      fragment.done = false;
      invalidateFragment(fragment);
      task.state = "wait";
      this.queuedJobs++;
      robot.assignment = null;
      robot.vectorOverlay = null;
      this.retiredRobots++;
      this.robots.splice(this.robots.indexOf(robot), 1);
      const origin = this.recallAnchor();
      const replacement = this.createRobot(origin.x, origin.y);
      replacement.bodyDesign = (robot.bodyDesign + 1 + Math.floor(Math.random() * 3)) % 4;
      replacement.color = robot.color === "#fff" ? "#000" : "#fff";
      replacement.summonedAt = this.time;
      this.assignJob(replacement, task);
      this.robots.push(replacement);
    }
    recallAnchor() {
      if (this.mouse) return this.toDocumentPosition(this.mouse.x, this.mouse.y);
      const viewportState = this.viewportState;
      return this.toDocumentPosition(
        viewportState.ox + viewportState.vw / 2,
        viewportState.oy + viewportState.vh / 2,
      );
    }
    recallCrew(dt, cursors = [...this.robots]) {
      const target = this.recallAnchor();
      for (const robot of cursors) {
        robot.returnElapsed = (robot.returnElapsed || 0) + dt;
        const slot = 1 - Math.exp(-dt * ((robot.recallRate || 9) + robot.returnElapsed * 35));
        if (robot.viewportAnchored) {
          const point = this.toDocumentPosition(robot.x, robot.y);
          robot.x = point.x;
          robot.y = point.y;
          robot.viewportAnchored = false;
        }
        robot.x += (target.x - robot.x) * slot;
        robot.y += (target.y - robot.y) * slot;
        robot.angle *= 1 - slot;
        robot.pressAmount = 0;
        robot.pose = "arrow";
        robot.vx = robot.vy = 0;
        if (Math.hypot(robot.x - target.x, robot.y - target.y) <= 1.5 || robot.returnElapsed >= 1.4) {
          robot.x = target.x;
          robot.y = target.y;
          if (robot.hasWorked) this.retiredRobots++;
          this.robots.splice(this.robots.indexOf(robot), 1);
        }
      }
    }
    advanceRecallMotion(dt, list, target, scale = 1) {
      const entry = this.mouse ? this.toDocumentPosition(this.mouse.x, this.mouse.y) : null;
      const travelOptions = target || this.recallAnchor();
      const time = this.time;
      if (entry && this.previousClock && dt > 0) {
        const slot = Math.min(1, dt * 18);
        this.viewportSample.x += ((entry.x - this.previousClock.x) / dt - this.viewportSample.x) * slot;
        this.viewportSample.y += ((entry.y - this.previousClock.y) / dt - this.viewportSample.y) * slot;
      }
      this.previousClock = entry;
      const followRadius = 135 * scale * (1 + 0.18 * Math.sin(time * 0.55));
      const swirl = Math.tanh(Math.cos(time * 0.11) * 3);
      const want = [];
      for (const robot of list) {
        const velocityX = robot.x - travelOptions.x;
        const velocityY = robot.y - travelOptions.y;
        const nodeValue = Math.hypot(velocityX, velocityY) || 0.01;
        const nx = velocityX / nodeValue;
        const ny = velocityY / nodeValue;
        const orbitAngle = Math.atan2(velocityY, velocityX);
        const off = (robot.orbit - 120) * 0.55 * scale;
        const orbitRadius = followRadius * (1 + 0.3 * Math.sin(3 * orbitAngle + time * 0.7)) + off;
        const tangentialForce = 300 * (0.7 + robot.spin * 0.2) * swirl;
        const radialForce = limitRange((orbitRadius - nodeValue) * 4, -2600, 1400);
        const far = Math.min(1, Math.max(0, (nodeValue - orbitRadius) / 600));
        want.push([
          -ny * tangentialForce + nx * radialForce - ny * robot.curl * 400 * far,
          nx * tangentialForce + ny * radialForce + nx * robot.curl * 400 * far,
        ]);
      }
      for (let indexValue = 0; indexValue < list.length; indexValue++) {
        const robot = list[indexValue];
        let anchorX = 0;
        let anchorY = 0;
        let wsum = 0;
        for (let j = 0; j < list.length; j++) {
          if (j === indexValue) continue;
          const flowPoint = list[j];
          const nodeValue = Math.hypot(flowPoint.x - robot.x, flowPoint.y - robot.y);
          if (nodeValue > 90) continue;
          const widthValue = 1 - nodeValue / 90;
          anchorX += flowPoint.vx * widthValue;
          anchorY += flowPoint.vy * widthValue;
          wsum += widthValue;
        }
        let [steeringX, steeringY] = want[indexValue];
        if (wsum > 0) {
          steeringX = steeringX * 0.7 + (anchorX / wsum) * 0.3;
          steeringY = steeringY * 0.7 + (anchorY / wsum) * 0.3;
        }
        const dist = Math.max(
          0,
          Math.hypot(robot.x - travelOptions.x, robot.y - travelOptions.y) - 180 * scale,
        );
        const maxV = robot.speed * (1.3 + Math.min(3.2, dist / 90));
        const glyphLeft = Math.hypot(steeringX, steeringY);
        if (glyphLeft > maxV) {
          steeringX *= maxV / glyphLeft;
          steeringY *= maxV / glyphLeft;
        }
        let desiredVelocityX = (steeringX - robot.vx) * 6;
        let desiredVelocityY = (steeringY - robot.vy) * 6;
        const maxF = robot.force * (1.4 + Math.min(5, dist / 50));
        const guideVisual = Math.hypot(desiredVelocityX, desiredVelocityY);
        if (guideVisual > maxF) {
          desiredVelocityX *= maxF / guideVisual;
          desiredVelocityY *= maxF / guideVisual;
        }
        robot.vx += desiredVelocityX * dt;
        robot.vy += desiredVelocityY * dt;
        robot.x += robot.vx * dt;
        robot.y += robot.vy * dt;
      }
      const minimumRadius = 48;
      let touched = false;
      if (entry)
        for (const robot of list) {
          const velocityX = robot.x - entry.x;
          const velocityY = robot.y - entry.y;
          const nodeValue = Math.hypot(velocityX, velocityY) || 0.01;
          if (nodeValue >= minimumRadius) continue;
          touched = true;
          const nx = velocityX / nodeValue;
          const ny = velocityY / nodeValue;
          robot.x = entry.x + nx * minimumRadius;
          robot.y = entry.y + ny * minimumRadius;
          const relativePosition =
            (robot.vx - this.viewportSample.x) * nx + (robot.vy - this.viewportSample.y) * ny;
          if (relativePosition < 0) {
            robot.vx -= nx * relativePosition * 1.6;
            robot.vy -= ny * relativePosition * 1.6;
          }
          robot.vx += nx * 260;
          robot.vy += ny * 260;
        }
      for (const robot of list) {
        if (Math.hypot(robot.vx, robot.vy) < 30) continue;
        const nodeValue =
          (((((Math.atan2(robot.vy, robot.vx) * 180) / Math.PI + 128 - robot.angle + 540) % 360) + 360) %
            360) -
          180;
        robot.angle += nodeValue * Math.min(1, dt * 8);
        robot.pressAmount = Math.max(0, robot.pressAmount - dt * 6);
      }
      return touched;
    }
    *pauseRoutine(phaseValue) {
      let quantity = 0;
      while (quantity < phaseValue) quantity += (yield) * this.workPace;
    }
    *travelTo(robot, target, travelOptions = {}) {
      const get = typeof target === "function" ? target : () => target;
      const firstTickX = robot.x;
      const firstTickY = robot.y;
      const departurePoint = get();
      const dist = Math.hypot(departurePoint.x - firstTickX, departurePoint.y - firstTickY);
      if (dist < 0.5) {
        robot.x = departurePoint.x;
        robot.y = departurePoint.y;
        if (travelOptions.onStep) travelOptions.onStep();
        return;
      }
      const travelDuration =
        limitRange(0.12 + Math.sqrt(dist) * 0.021, 0.14, 0.9) / (travelOptions.speed || 1);
      const bend =
        (travelOptions.bend != null
          ? travelOptions.bend
          : (Math.random() < 0.5 ? -1 : 1) * sampleRange(0.04, 0.14)) * Math.min(dist, 600);
      let phaseValue = 0;
      while (phaseValue < travelDuration) {
        phaseValue += (yield) * (travelOptions.playOpeningCue ? 1 : this.workPace);
        const slot = Math.min(1, phaseValue / travelDuration);
        const e = travelOptions.playOpeningCue
          ? (1 - Math.cos(Math.PI * slot)) / 2
          : travelOptions.drag || slot < 0.15
            ? smoothTravel(slot)
            : settleTravel(slot);
        const point = get();
        const horizontalDelta = point.x - firstTickX;
        const verticalDelta = point.y - firstTickY;
        const glyphLeft = Math.hypot(horizontalDelta, verticalDelta) || 1;
        const off = Math.sin(Math.PI * e) * bend;
        robot.x = firstTickX + horizontalDelta * e + (-verticalDelta / glyphLeft) * off;
        robot.y = firstTickY + verticalDelta * e + (horizontalDelta / glyphLeft) * off;
        if (travelOptions.onStep) travelOptions.onStep();
      }
      const point = get();
      robot.x = point.x;
      robot.y = point.y;
      if (travelOptions.onStep) travelOptions.onStep();
    }
    *pressRobot(robot) {
      robot.pressAmount = 1;
      if (this.audioRack)
        this.audioRack.playPressCue(this.robotScreenPosition(robot).x, this.viewportState.vw);
      yield* this.pauseRoutine(0.07);
    }
    *typeGlyphs(fragment, robot) {
      const sampleCount = fragment.glyphCount;
      const slot = limitRange(70 / Math.max(1, sampleCount), 0.06, 1);
      let budget = 0;
      let indexValue = fragment.visibleGlyphCount;
      while (indexValue < sampleCount) {
        budget += (yield) * this.workPace;
        while (indexValue < sampleCount && budget > 0) {
          const childElement = fragment.seq[indexValue];
          let nodeValue = sampleRange(0.012, 0.04);
          if (childElement === " ") nodeValue += sampleRange(0, 0.03);
          if (childElement === "\n") nodeValue += 0.1;
          if (Math.random() < 0.025) nodeValue += sampleRange(0.08, 0.2);
          budget -= nodeValue * slot;
          indexValue++;
        }
        if (robot && this.audioRack && indexValue > fragment.visibleGlyphCount)
          this.audioRack.playTypingCue(
            this.robotScreenPosition(robot).x,
            this.viewportState.vw,
            robot.id,
            indexValue - fragment.visibleGlyphCount,
            /\s/.test(fragment.seq.slice(fragment.visibleGlyphCount, indexValue)) ? 1 : 0,
          );
        fragment.visibleGlyphCount = indexValue;
        invalidateFragment(fragment);
      }
    }
    *roam(robot) {
      for (;;) {
        const viewportState = this.viewportState;
        const top = this.visibleTop;
        const bot = this.visibleBottom;
        const point = {
          x: sampleRange(
            viewportState.sx + viewportState.vw * 0.17,
            viewportState.sx + viewportState.vw * 0.83,
          ),
          y: sampleRange(top + (bot - top) * 0.2, top + (bot - top) * 0.8),
        };
        yield* this.travelTo(robot, point, {
          speed: robot.launchRobot ? 0.85 : 0.35,
        });
        if (robot.launchRobot) continue;
        let widthValue = sampleRange(0.4, 1.4);
        while (widthValue > 0) {
          widthValue -= yield;
          if (robot.y < this.visibleTop || robot.y > this.visibleBottom) break;
        }
      }
    }
    *depart(robot) {
      const right = robot.x > this.viewportState.sx + this.viewportState.vw / 2;
      yield* this.travelTo(
        robot,
        () => {
          const viewportState = this.viewportState;
          return this.toDocumentPosition(
            right ? viewportState.ox + viewportState.vw + 60 : viewportState.ox - 60,
            robot.y - this.visibleTop + viewportState.oy,
          );
        },
        {
          speed: 0.8,
        },
      );
    }
    execute(robot, job) {
      const jobSpec = job.spec;
      if (this.failureJobs.has(job) && !jobSpec.it.errorRetried) {
        jobSpec.it.errorRetried = true;
        this.failedJobs++;
        return this.performRepair(robot, job);
      }
      if (jobSpec.type === "rect" || jobSpec.type === "image") {
        const isMedia = jobSpec.type === "image";
        return jobSpec.it.relocationPending
          ? this.paintRelocatedSurface(robot, jobSpec.it, isMedia)
          : this.paintPanel(robot, jobSpec.it, isMedia);
      }
      switch (jobSpec.type) {
        case "animation-sweep":
          return this.revealAnimatedSurface(robot, jobSpec.it, jobSpec.worker);
        case "line":
          return this.paintVector(robot, jobSpec.it);
        case "text":
          return this.paintText(robot, jobSpec.it, jobSpec.playSnapCue || null, !!jobSpec.playGrowthCue);
        case "guide":
          return this.positionGuide(robot, jobSpec.g);
        case "dup":
          return this.replicateComponent(robot, jobSpec.g, jobSpec.k);
        case "edit":
          return this.reviseText(robot, jobSpec.it);
        case "restyle":
        case "swap":
          return this.applyFinalAppearance(robot, jobSpec.it);
        default:
          return this.pauseRoutine(0.1);
      }
    }
    clippedDragTarget(robot, fragment) {
      const viewportState = this.viewportState;
      const screen = robot.viewportAnchored;
      const right = screen ? viewportState.ox + viewportState.vw : viewportState.sx + viewportState.vw;
      const bot = screen ? viewportState.oy + viewportState.vh : this.visibleBottom;
      const x =
        fragment.x + fragment.w > right - 16
          ? Math.max(fragment.x + Math.min(fragment.w, 40), right - 30)
          : fragment.x + fragment.w;
      const y =
        fragment.y + fragment.h > bot - 16
          ? Math.max(fragment.y + Math.min(fragment.h, 40), bot - 40)
          : fragment.y + fragment.h;
      return {
        x: Math.min(x, fragment.x + fragment.w),
        y: Math.min(y, fragment.y + fragment.h),
      };
    }
    /* Share one clock and one reveal edge across the full crew.*/
    *revealAnimatedSurface(robot, fragment, worker) {
      const viewportState = this.viewportState;
      const left = fragment.layer === "world" ? viewportState.sx : viewportState.ox;
      const top = fragment.layer === "world" ? viewportState.sy : viewportState.oy;
      const x = fragment.x + (fragment.revealFromRight ? fragment.w : 0);
      const y = limitRange(
        fragment.y + ((worker + 0.5) / CREW_MINIMUM) * fragment.h,
        top + 12,
        top + viewportState.vh - 12,
      );
      const horizontalDelta = fragment.revealFromRight ? -fragment.w : fragment.w;
      robot.pose = "cross";
      yield* this.travelTo(
        robot,
        {
          x: limitRange(x, left + 12, left + viewportState.vw - 12),
          y,
        },
        {
          bend: 0,
        },
      );
      const batch = robot.assignment.revealBatch;
      batch.ready++;
      if (batch.ready === batch.glyphCount) batch.start = this.time;
      while (batch.start == null) yield;
      robot.pressAmount = 1;
      fragment.isVisible = true;
      fragment.styled = true;
      invalidateFragment(fragment);
      let progress = 0;
      while (progress < 1) {
        progress = limitRange((this.time - batch.start) / 0.9, 0, 1);
        fragment.revealProgress = smoothTravel(progress);
        robot.x = limitRange(
          x + horizontalDelta * fragment.revealProgress,
          left + 12,
          left + viewportState.vw - 12,
        );
        robot.y = y;
        invalidateFragment(fragment);
        if (progress < 1) yield;
      }
      fragment.revealProgress = 1;
      fragment.done = fragment.completionJobs.every(
        (task) => task === robot.assignment || task.state === "done",
      );
      invalidateFragment(fragment);
      robot.pose = "arrow";
      if (fragment.done) this.playPlacementCue("image", fragment);
    }
    *paintRelocatedSurface(robot, fragment, isImg) {
      const x = fragment.x,
        y = fragment.y,
        clip = fragment.clip;
      const viewportState = this.viewportState;
      const left = fragment.layer === "world" ? viewportState.sx : viewportState.ox;
      const top = fragment.layer === "world" ? viewportState.sy : viewportState.oy;
      fragment.x = limitRange(
        left + viewportState.vw - (x - left) - fragment.w,
        left + 12,
        left + viewportState.vw - fragment.w - 12,
      );
      fragment.y = limitRange(
        top + viewportState.vh - (y - top) - fragment.h,
        top + 12,
        top + viewportState.vh - fragment.h - 12,
      );
      fragment.clip = null;
      yield* this.paintPanel(robot, fragment, isImg);
      fragment.done = false;
      const fromX = fragment.x,
        fromY = fragment.y;
      const point = {
        x: fromX + fragment.w / 2,
        y: fromY + fragment.h / 2,
      };
      robot.pose = "cross";
      yield* this.travelTo(robot, point);
      robot.pressAmount = 1;
      robot.vectorOverlay = () => [this.selectionVisual(fragment)];
      yield* this.travelTo(
        robot,
        {
          x: point.x + x - fromX,
          y: point.y + y - fromY,
        },
        {
          drag: true,
          speed: 0.45,
          bend: 0,
          onStep: () => {
            fragment.x = fromX + robot.x - point.x;
            fragment.y = fromY + robot.y - point.y;
            invalidateFragment(fragment);
          },
        },
      );
      fragment.x = x;
      fragment.y = y;
      fragment.clip = clip;
      fragment.relocationPending = false;
      fragment.done = true;
      robot.vectorOverlay = null;
      robot.pose = "arrow";
      invalidateFragment(fragment);
    }
    *paintPanel(robot, fragment, isImg) {
      robot.pose = "cross";
      yield* this.travelTo(robot, {
        x: fragment.x,
        y: fragment.y,
      });
      robot.pressAmount = 1;
      fragment.isVisible = true;
      if (fragment.big) fragment.styled = true;
      fragment.draw = {
        w: 0,
        h: 0,
      };
      invalidateFragment(fragment);
      robot.vectorOverlay = () => [this.selectionVisual(fragment)];
      const end = this.clippedDragTarget(robot, fragment);
      yield* this.travelTo(robot, end, {
        speed: 0.75,
        drag: true,
        bend: 0,
        onStep: () => {
          fragment.draw = {
            w: Math.max(0, robot.x - fragment.x),
            h: Math.max(0, robot.y - fragment.y),
          };
          invalidateFragment(fragment);
        },
      });
      if (end.x < fragment.x + fragment.w - 0.5 || end.y < fragment.y + fragment.h - 0.5) {
        const w0 = fragment.draw.w;
        const h0 = fragment.draw.h;
        let slot = 0;
        while (slot < 1) {
          slot = Math.min(1, slot + ((yield) * this.workPace) / 0.5);
          const e = settleTravel(slot);
          fragment.draw = {
            w: w0 + (fragment.w - w0) * e,
            h: h0 + (fragment.h - h0) * e,
          };
          invalidateFragment(fragment);
        }
      }
      fragment.draw = null;
      invalidateFragment(fragment);
      robot.pose = "arrow";
      yield* this.pauseRoutine(sampleRange(0.18, 0.3));
      fragment.styled = true;
      invalidateFragment(fragment);
      this.playPlacementCue(isImg ? "image" : "rect", fragment);
      yield* this.pauseRoutine(isImg ? 0.5 : 0.35);
      robot.vectorOverlay = null;
      fragment.done = true;
      fragment.repairPending = false;
      invalidateFragment(fragment);
    }
    *paintVector(robot, fragment) {
      robot.pose = "pen-add";
      yield* this.travelTo(robot, fragment.pts[0]);
      yield* this.pressRobot(robot);
      fragment.isVisible = true;
      fragment.edit = true;
      fragment.placed = 1;
      fragment.owner = robot;
      invalidateFragment(fragment);
      this.activeVectors.add(fragment);
      robot.pose = "pen";
      for (let indexValue = 1; indexValue < fragment.pts.length; indexValue++) {
        yield* this.travelTo(robot, fragment.pts[indexValue], {
          bend: sampleRange(-0.03, 0.03),
        });
        yield* this.pressRobot(robot);
        fragment.placed = indexValue + 1;
        invalidateFragment(fragment);
        yield* this.pauseRoutine(sampleRange(0.04, 0.12));
      }
      fragment.owner = null;
      invalidateFragment(fragment);
      yield* this.travelTo(
        robot,
        {
          x: robot.x + sampleRange(14, 30),
          y: robot.y + sampleRange(10, 24),
        },
        {
          speed: 1.4,
        },
      );
      yield* this.pauseRoutine(0.3);
      fragment.edit = false;
      this.activeVectors.delete(fragment);
      fragment.done = true;
      invalidateFragment(fragment);
      this.playPlacementCue("line", fragment);
    }
    *paintText(robot, fragment, guide, grow) {
      if (guide) {
        if (guide.axis === "x") {
          fragment.dx = sampleRange(28, 64);
          fragment.dy = sampleRange(-8, 8);
        } else {
          fragment.dx = sampleRange(-8, 8);
          fragment.dy = sampleRange(18, 34) * (Math.random() < 0.5 ? -1 : 1);
        }
      }
      if (grow) fragment.scale = Math.min(1, 18 / fragment.fs);
      const initialRectangle = this.fragmentRectangle(fragment);
      robot.pose = "cross";
      yield* this.travelTo(robot, {
        x: initialRectangle.x,
        y: initialRectangle.y,
      });
      const lineH = Math.min(initialRectangle.h, fragment.lineHeightValue * fragment.scale);
      if (initialRectangle.w < 140 && fragment.textBounds.h < fragment.lineHeightValue * 1.6) {
        yield* this.pressRobot(robot);
      } else {
        robot.pressAmount = 1;
        const ghost = {
          x: initialRectangle.x,
          y: initialRectangle.y,
          w: 0,
          h: 0,
        };
        robot.vectorOverlay = () => [
          {
            t: "box",
            b: ghost,
            handles: true,
            badge: `${Math.round(ghost.w)} × ${Math.round(ghost.h)}`,
            rulerLines: true,
          },
        ];
        yield* this.travelTo(
          robot,
          {
            x: initialRectangle.x + initialRectangle.w,
            y: initialRectangle.y + lineH,
          },
          {
            speed: 0.9,
            drag: true,
            bend: 0,
            onStep: () => {
              ghost.w = Math.max(0, robot.x - initialRectangle.x);
              ghost.h = Math.max(0, robot.y - initialRectangle.y);
            },
          },
        );
      }
      fragment.isVisible = true;
      fragment.typingActive = true;
      fragment.visibleGlyphCount = 0;
      invalidateFragment(fragment);
      robot.pose = "ibeam";
      robot.vectorOverlay = () => [
        {
          t: "box",
          b: this.fragmentRectangle(fragment),
        },
      ];
      yield* this.travelTo(
        robot,
        {
          x: robot.x + sampleRange(-30, 10),
          y: robot.y + sampleRange(10, 30),
        },
        {
          speed: 1.5,
        },
      );
      yield* this.typeGlyphs(fragment, robot);
      yield* this.pauseRoutine(0.12);
      fragment.typingActive = false;
      invalidateFragment(fragment);
      this.playPlacementCue("text", fragment);
      robot.pose = "arrow";
      robot.vectorOverlay = () => [this.selectionVisual(fragment)];
      if (grow) {
        const steps = [24, 32, 40, 48, 56, 64, 72, 88, 104].filter(
          (markup) => markup < fragment.fs && markup > 18,
        );
        let slot = 0;
        for (const markup of [...steps, fragment.fs]) {
          yield* this.pauseRoutine(0.06);
          fragment.scale = markup / fragment.fs;
          invalidateFragment(fragment);
          if (this.audioRack)
            this.audioRack.playGrowthCue(slot++, this.robotScreenPosition(robot).x, this.viewportState.vw);
        }
        fragment.scale = 1;
        invalidateFragment(fragment);
        yield* this.pauseRoutine(0.15);
      }
      if (guide) {
        let waitedSeconds = 0;
        while (guide.assignment.state !== "done" && waitedSeconds < 1.6)
          waitedSeconds += (yield) * this.workPace;
        if (guide.assignment.state !== "done") guide = null;
      }
      if (guide) {
        const segment = this.fragmentRectangle(fragment);
        const firstValue = {
          x: segment.x + Math.min(segment.w * 0.4, 60) + sampleRange(-6, 6),
          y: segment.y + Math.min(segment.h * 0.5, 22),
        };
        yield* this.travelTo(robot, firstValue);
        robot.pressAmount = 1;
        const point = {
          x: firstValue.x - fragment.dx,
          y: firstValue.y - fragment.dy,
        };
        const entry = {
          x: point.x + (guide.axis === "x" ? -sampleRange(2, 5) : sampleRange(-6, 6)),
          y: point.y + (guide.axis === "y" ? -sampleRange(2, 5) : sampleRange(-3, 3)),
        };
        const drag = () => {
          let heightValue = robot.x - point.x;
          let record = robot.y - point.y;
          if (guide.axis === "x" && Math.abs(heightValue) < 9) {
            if (heightValue !== 0 && fragment.dx !== 0) {
              if (guide.flash < 0.5 && this.audioRack)
                this.audioRack.playSnapCue(this.robotScreenPosition(robot).x, this.viewportState.vw);
              guide.flash = 1;
            }
            heightValue = 0;
          }
          if (guide.axis === "y" && Math.abs(record) < 9) {
            if (record !== 0 && fragment.dy !== 0) {
              if (guide.flash < 0.5 && this.audioRack)
                this.audioRack.playSnapCue(this.robotScreenPosition(robot).x, this.viewportState.vw);
              guide.flash = 1;
            }
            record = 0;
          }
          fragment.dx = heightValue;
          fragment.dy = record;
          invalidateFragment(fragment);
        };
        yield* this.travelTo(robot, entry, {
          speed: 0.6,
          drag: true,
          onStep: drag,
        });
        yield* this.pauseRoutine(0.1);
        yield* this.travelTo(robot, point, {
          speed: 2,
          onStep: drag,
        });
        fragment.dx = 0;
        fragment.dy = 0;
        invalidateFragment(fragment);
        yield* this.pauseRoutine(0.25);
      } else if (fragment.dx || fragment.dy) {
        const initialDeltaX = fragment.dx;
        const initialDeltaY = fragment.dy;
        let slot = 0;
        while (slot < 1) {
          slot = Math.min(1, slot + ((yield) * this.workPace) / 0.3);
          const e = smoothTravel(slot);
          fragment.dx = initialDeltaX * (1 - e);
          fragment.dy = initialDeltaY * (1 - e);
          invalidateFragment(fragment);
        }
        yield* this.pauseRoutine(0.15);
      } else yield* this.pauseRoutine(0.2);
      robot.vectorOverlay = null;
      fragment.done = true;
      invalidateFragment(fragment);
    }
    *positionGuide(robot, alignmentGuide) {
      this.rulers.want++;
      try {
        const rectangle = sampleRange(-0.15, 0.15);
        const from = () => {
          const viewportState = this.viewportState;
          return alignmentGuide.axis === "x"
            ? this.toDocumentPosition(
                viewportState.ox + 10,
                viewportState.oy + viewportState.vh * (0.45 + rectangle),
              )
            : this.toDocumentPosition(
                viewportState.ox + viewportState.vw * 0.3 + rectangle * 200,
                viewportState.oy + 10,
              );
        };
        robot.pose = "arrow";
        yield* this.travelTo(robot, from);
        while (this.rulers.t < 0.95) yield;
        yield* this.travelTo(robot, from, {
          speed: 3,
        });
        robot.pressAmount = 1;
        robot.pose = alignmentGuide.axis === "x" ? "ew" : "ns";
        alignmentGuide.isVisible = true;
        alignmentGuide.dragging = true;
        alignmentGuide.op = 1;
        const updateDragPosition = () => {
          alignmentGuide.cur = alignmentGuide.axis === "x" ? robot.x : robot.y;
        };
        updateDragPosition();
        const to = () => {
          const markup = from();
          return alignmentGuide.axis === "x"
            ? {
                x: alignmentGuide.pos,
                y: markup.y + 40,
              }
            : {
                x: markup.x + 30,
                y: alignmentGuide.pos,
              };
        };
        yield* this.travelTo(robot, to, {
          speed: 0.55,
          drag: true,
          onStep: updateDragPosition,
        });
        alignmentGuide.cur = alignmentGuide.pos;
        alignmentGuide.dragging = false;
        if (this.audioRack) {
          const point = this.robotScreenPosition(robot);
          this.audioRack.playPlacement(
            "guide",
            point.x,
            point.y,
            1,
            1,
            this.viewportState.vw,
            this.viewportState.vh,
            0,
          );
        }
        robot.pose = "arrow";
        yield* this.pauseRoutine(0.25);
      } finally {
        this.rulers.want--;
      }
    }
    *replicateComponent(robot, alignmentGuide, slot) {
      const replicaElement = alignmentGuide.dst[slot];
      let sourceElement = alignmentGuide.src;
      const snapCandidate = [
        alignmentGuide.src,
        ...alignmentGuide.dst.filter((nodeValue) => nodeValue.assignment.state === "done"),
      ];
      const candidateDistance = (firstValue) =>
        Math.hypot(firstValue.box.x - replicaElement.box.x, firstValue.box.y - replicaElement.box.y);
      for (const markup of snapCandidate)
        if (candidateDistance(markup) < candidateDistance(sourceElement)) sourceElement = markup;
      const sourceRectangle = this.combinedRectangle(sourceElement.fragments);
      robot.pose = "arrow";
      const segment = {
        x: sourceRectangle.x + Math.min(sourceRectangle.w * 0.45, 70) + sampleRange(-8, 8),
        y: sourceRectangle.y + Math.min(sourceRectangle.h * 0.45, 30) + sampleRange(-4, 4),
      };
      yield* this.travelTo(robot, segment);
      yield* this.pressRobot(robot);
      robot.vectorOverlay = () => [
        {
          t: "box",
          b: sourceRectangle,
          handles: true,
          badge: `${Math.round(sourceRectangle.w)} × ${Math.round(sourceRectangle.h)}`,
        },
      ];
      yield* this.pauseRoutine(sampleRange(0.15, 0.3));
      robot.pose = "dup";
      yield* this.pauseRoutine(0.12);
      robot.pressAmount = 1;
      const viewportOffsetX = sourceElement.box.x - replicaElement.box.x;
      const viewportOffsetY = sourceElement.box.y - replicaElement.box.y;
      for (const fragment of replicaElement.fragments) {
        fragment.isVisible = true;
        fragment.mode = "master";
        fragment.dx = viewportOffsetX;
        fragment.dy = viewportOffsetY;
        if (fragment.kind === "rect" || fragment.kind === "image") {
          fragment.styled = true;
          fragment.draw = null;
        }
        if (fragment.kind === "line") {
          fragment.placed = fragment.pts.length;
        }
        invalidateFragment(fragment);
      }
      const entry = {
        x: segment.x - viewportOffsetX,
        y: segment.y - viewportOffsetY,
      };
      robot.vectorOverlay = () => {
        const copyRectangle = this.combinedRectangle(replicaElement.fragments);
        const heightValue = [
          {
            t: "box",
            b: sourceRectangle,
            color: "red",
          },
          {
            t: "box",
            b: copyRectangle,
            color: "red",
          },
        ];
        const pseudoNode = this.spacingVisual(sourceRectangle, copyRectangle);
        if (pseudoNode) heightValue.push(pseudoNode);
        return heightValue;
      };
      yield* this.travelTo(robot, entry, {
        speed: 0.6,
        drag: true,
        onStep: () => {
          for (const fragment of replicaElement.fragments) {
            fragment.dx = viewportOffsetX + (robot.x - segment.x);
            fragment.dy = viewportOffsetY + (robot.y - segment.y);
            invalidateFragment(fragment);
          }
        },
      });
      this.playPlacementCue(
        "dup",
        replicaElement.fragments[0],
        this.combinedRectangle(replicaElement.fragments),
      );
      for (const fragment of replicaElement.fragments) {
        fragment.dx = 0;
        fragment.dy = 0;
        fragment.settle = true;
        if (!fragment.editTask) fragment.mode = "own";
        if (fragment.kind === "text" && fragment.mode === "own")
          fragment.visibleGlyphCount = fragment.glyphCount;
        invalidateFragment(fragment);
      }
      yield* this.pauseRoutine(0.1);
      robot.pose = "arrow";
      robot.vectorOverlay = () => {
        const copyRectangle = this.combinedRectangle(replicaElement.fragments);
        return [
          {
            t: "box",
            b: copyRectangle,
            handles: true,
            badge: `${Math.round(copyRectangle.w)} × ${Math.round(copyRectangle.h)}`,
          },
        ];
      };
      yield* this.pauseRoutine(0.35);
      for (const fragment of replicaElement.fragments)
        if (!fragment.editTask) {
          fragment.done = true;
          invalidateFragment(fragment);
        }
    }
    spacingVisual(firstValue, secondValue) {
      const viewportOffsetY =
        Math.min(firstValue.y + firstValue.h, secondValue.y + secondValue.h) -
        Math.max(firstValue.y, secondValue.y);
      const viewportOffsetX =
        Math.min(firstValue.x + firstValue.w, secondValue.x + secondValue.w) -
        Math.max(firstValue.x, secondValue.x);
      if (viewportOffsetY > 0) {
        const y = Math.max(firstValue.y, secondValue.y) + viewportOffsetY / 2;
        const [leftEdge, rectangle] =
          firstValue.x < secondValue.x ? [firstValue, secondValue] : [secondValue, firstValue];
        const gap = rectangle.x - (leftEdge.x + leftEdge.w);
        if (gap > 0)
          return {
            t: "measure",
            a: {
              x: leftEdge.x + leftEdge.w,
              y,
            },
            b: {
              x: rectangle.x,
              y,
            },
            label: String(Math.round(gap)),
          };
      } else if (viewportOffsetX > 0) {
        const x = Math.max(firstValue.x, secondValue.x) + viewportOffsetX / 2;
        const [phaseValue, bottomPosition] =
          firstValue.y < secondValue.y ? [firstValue, secondValue] : [secondValue, firstValue];
        const gap = bottomPosition.y - (phaseValue.y + phaseValue.h);
        if (gap > 0)
          return {
            t: "measure",
            a: {
              x,
              y: phaseValue.y + phaseValue.h,
            },
            b: {
              x,
              y: bottomPosition.y,
            },
            label: String(Math.round(gap)),
          };
      }
      return null;
    }
    *reviseText(robot, fragment) {
      robot.pose = "arrow";
      const secondValue = this.fragmentRectangle(fragment);
      yield* this.travelTo(robot, {
        x: secondValue.x + Math.min(secondValue.w * 0.5, 50) + sampleRange(-5, 5),
        y: secondValue.y + Math.min(fragment.lineHeightValue, secondValue.h) * 0.55,
      });
      yield* this.pressRobot(robot);
      yield* this.pauseRoutine(0.08);
      yield* this.pressRobot(robot);
      fragment.allGlyphsSelected = true;
      fragment.typingActive = true;
      invalidateFragment(fragment);
      robot.pose = "ibeam";
      robot.vectorOverlay = () => [
        {
          t: "box",
          b: this.fragmentRectangle(fragment),
        },
      ];
      yield* this.pauseRoutine(sampleRange(0.2, 0.35));
      fragment.mode = "own";
      fragment.allGlyphsSelected = false;
      fragment.visibleGlyphCount = 0;
      invalidateFragment(fragment);
      yield* this.typeGlyphs(fragment, robot);
      yield* this.pauseRoutine(0.12);
      fragment.typingActive = false;
      invalidateFragment(fragment);
      robot.pose = "arrow";
      robot.vectorOverlay = () => [this.selectionVisual(fragment)];
      this.playPlacementCue("edit", fragment);
      yield* this.pauseRoutine(0.3);
      robot.vectorOverlay = null;
      fragment.done = true;
      invalidateFragment(fragment);
    }
    *applyFinalAppearance(robot, fragment) {
      robot.pose = "arrow";
      const secondValue = this.fragmentRectangle(fragment);
      yield* this.travelTo(robot, {
        x: secondValue.x + Math.min(secondValue.w * 0.5, 60) + sampleRange(-6, 6),
        y: secondValue.y + Math.min(secondValue.h * 0.5, 30) + sampleRange(-4, 4),
      });
      yield* this.pressRobot(robot);
      robot.vectorOverlay = () => [this.selectionVisual(fragment)];
      yield* this.pauseRoutine(sampleRange(0.15, 0.3));
      fragment.mode = "own";
      invalidateFragment(fragment);
      this.playPlacementCue(fragment.kind === "image" ? "image" : "restyle", fragment);
      yield* this.pauseRoutine(0.4);
      robot.vectorOverlay = null;
      fragment.done = true;
      invalidateFragment(fragment);
    }
  }
  let audioEnabledByUser = true;
  const AUDIO_BUTTON_GLYPH =
    '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6v4h2.5l3.5 3V3L5 6z" fill="currentColor"/></svg>';
  /* Build short industrial cues from noise bands and FM oscillators.*/
  class CyberAudioRack {
    constructor() {
      this.on = audioEnabledByUser;
      this.ctx = null;
      this.renderClock = null;
      this.voiceCooldowns = new Map();
      this.events = [];
      this.activeVoices = 0;
    }
    get needsAudioGesture() {
      return this.renderClock == null && (!this.ctx || this.ctx.state !== "running");
    }
    initializeAudio(offline) {
      if (this.ctx) return true;
      if (!offline && !navigator.userActivation?.hasBeenActive) return false;
      try {
        const AudioContextType = window.AudioContext || window.webkitAudioContext;
        const audioContext = (this.ctx =
          offline ||
          new AudioContextType({
            latencyHint: "interactive",
          }));
        this.out = audioContext.createGain();
        this.out.gain.value = this.on ? 0.7 : 0;
        const compressorNode = audioContext.createDynamicsCompressor();
        compressorNode.threshold.value = -20;
        compressorNode.knee.value = 8;
        compressorNode.ratio.value = 8;
        compressorNode.attack.value = 0.002;
        compressorNode.release.value = 0.12;
        this.master = audioContext.createGain();
        this.master.gain.value = 0.65;
        this.master.connect(compressorNode);
        compressorNode.connect(this.out);
        this.out.connect(audioContext.destination);
        this.noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let indexValue = 0; indexValue < data.length; indexValue++)
          data[indexValue] = Math.random() * 2 - 1;
        return true;
      } catch (ignoredError) {
        return false;
      }
    }
    audioTime() {
      return this.renderClock != null ? this.renderClock : this.ctx.currentTime;
    }
    setAudioEnabled(on) {
      this.on = audioEnabledByUser = on;
      if (!this.ctx) return;
      const phaseValue = this.ctx.currentTime;
      this.out.gain.cancelScheduledValues(phaseValue);
      this.out.gain.setTargetAtTime(on ? 0.7 : 0, phaseValue, 0.025);
      if (on) this.resumeAudio();
    }
    resumeAudio() {
      if (!this.on || !navigator.userActivation?.hasBeenActive) return;
      if (!this.ctx && !this.initializeAudio()) return;
      if (this.ctx && this.ctx.state === "suspended" && this.ctx.resume) this.ctx.resume().catch(() => {});
    }
    recordCue(fn, args) {
      if (Array.isArray(window.__smartRobotAudioEvents))
        window.__smartRobotAudioEvents.push({
          t: performance.now() / 1000,
          fn,
          args,
        });
    }
    isReady() {
      return this.ctx && this.on && (this.renderClock != null || this.ctx.state === "running");
    }
    reserveVoice(name, gap) {
      if (!this.isReady()) return false;
      const phaseValue = this.audioTime();
      if (phaseValue - (this.voiceCooldowns.get(name) ?? -Infinity) < gap) return false;
      this.events = this.events.filter((attributeValue) => phaseValue - attributeValue < 1);
      if (this.events.length >= 32) return false;
      this.events.push(phaseValue);
      this.voiceCooldowns.set(name, phaseValue);
      return true;
    }
    stereoPosition(x, viewportWidth) {
      return limitRange((x / Math.max(1, viewportWidth)) * 1.6 - 0.8, -0.8, 0.8);
    }
    scheduleVoice(when, duration, from, to, level, pan = 0, texture = "noise", depth = 0) {
      if (this.activeVoices >= 48) return;
      const audioContext = this.ctx;
      const envelope = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      const stereo = audioContext.createStereoPanner();
      const source =
        texture === "noise" ? audioContext.createBufferSource() : audioContext.createOscillator();
      const nodes = [source, filter, envelope, stereo];
      let modulatorNode;
      if (texture === "noise") {
        source.buffer = this.noiseBuffer;
        source.loop = true;
        filter.type = "bandpass";
        filter.Q.value = 2.5;
        filter.frequency.setValueAtTime(from, when);
        filter.frequency.exponentialRampToValueAtTime(to, when + duration);
      } else {
        source.type = "sine";
        source.frequency.setValueAtTime(from, when);
        source.frequency.exponentialRampToValueAtTime(to, when + duration);
        filter.type = "lowpass";
        filter.frequency.value = 6500;
        if (depth) {
          modulatorNode = audioContext.createOscillator();
          const index = audioContext.createGain();
          modulatorNode.frequency.setValueAtTime(from * 1.414, when);
          modulatorNode.frequency.exponentialRampToValueAtTime(to * 2.71, when + duration);
          index.gain.setValueAtTime(depth, when);
          index.gain.exponentialRampToValueAtTime(0.1, when + duration);
          modulatorNode.connect(index);
          index.connect(source.frequency);
          nodes.push(modulatorNode, index);
          modulatorNode.start(when);
          modulatorNode.stop(when + duration + 0.02);
        }
      }
      envelope.gain.setValueAtTime(0.0001, when);
      envelope.gain.exponentialRampToValueAtTime(level, when + Math.min(0.012, duration * 0.15));
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      stereo.pan.setValueAtTime(pan, when);
      stereo.pan.linearRampToValueAtTime(-pan * 0.5, when + duration);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(stereo);
      stereo.connect(this.master);
      this.activeVoices++;
      source.onended = () => {
        for (const node of nodes) node.disconnect();
        this.activeVoices--;
      };
      source.start(when);
      source.stop(when + duration + 0.025);
    }
    playTypingCue(x, viewportWidth, identity, quantity = 1, space = 0) {
      this.recordCue("key", [x, viewportWidth, identity, quantity, space]);
      if (!this.reserveVoice("key", 0.045)) return;
      const phaseValue = this.audioTime() + 0.004;
      const pan = this.stereoPosition(x, viewportWidth);
      this.scheduleVoice(phaseValue, 0.027, space ? 480 : 2800, space ? 180 : 1100, 0.1, pan);
      if (quantity > 1) this.scheduleVoice(phaseValue + 0.023, 0.018, 1900, 3700, 0.055, pan, "fm", 800);
    }
    playPressCue(x, viewportWidth) {
      this.recordCue("press", [x, viewportWidth]);
      if (!this.reserveVoice("press", 0.055)) return;
      const phaseValue = this.audioTime() + 0.004;
      const pan = this.stereoPosition(x, viewportWidth);
      this.scheduleVoice(phaseValue, 0.05, 190, 62, 0.2, pan, "fm", 160);
      this.scheduleVoice(phaseValue, 0.016, 4200, 1600, 0.09, pan);
    }
    playPlacement(kind, x, y, widthValue, heightValue, viewportWidth, viewportHeight, fontSizeValue) {
      this.recordCue("place", [
        kind,
        x,
        y,
        widthValue,
        heightValue,
        viewportWidth,
        viewportHeight,
        fontSizeValue,
      ]);
      if (!this.reserveVoice("place", 0.075)) return;
      const phaseValue = this.audioTime() + 0.004;
      const pan = this.stereoPosition(x, viewportWidth);
      const off = y < -40 || y > viewportHeight + 40 ? 0.35 : 1;
      const large = widthValue * heightValue > viewportWidth * viewportHeight * 0.025;
      this.scheduleVoice(
        phaseValue,
        large ? 0.19 : 0.075,
        large ? 160 : 640,
        large ? 38 : 180,
        (large ? 0.32 : 0.13) * off,
        pan,
        "fm",
        large ? 220 : 460,
      );
      this.scheduleVoice(phaseValue + 0.026, 0.045, 5200, 1400, 0.07 * off, -pan);
      if (kind === "image" || kind === "dup")
        this.scheduleVoice(phaseValue + 0.07, 0.09, 900, 3600, 0.08 * off, pan, "fm", 900);
    }
    playGrowthCue(step, x, viewportWidth) {
      this.recordCue("grow", [step, x, viewportWidth]);
      if (!this.reserveVoice("grow", 0.07)) return;
      this.scheduleVoice(
        this.audioTime() + 0.004,
        0.05,
        800 + step * 80,
        2200 + step * 100,
        0.08,
        this.stereoPosition(x, viewportWidth),
      );
    }
    playSnapCue(x, viewportWidth) {
      this.recordCue("snap", [x, viewportWidth]);
      if (!this.reserveVoice("snap", 0.09)) return;
      this.scheduleVoice(
        this.audioTime() + 0.004,
        0.06,
        1250,
        310,
        0.15,
        this.stereoPosition(x, viewportWidth),
        "fm",
        1800,
      );
    }
    playFailureCue(x, viewportWidth) {
      this.recordCue("error", [x, viewportWidth]);
      if (!this.isReady()) return;
      const phaseValue = this.audioTime() + 0.004;
      const pan = this.stereoPosition(x, viewportWidth);
      for (const offset of [0, 0.08, 0.19])
        this.scheduleVoice(phaseValue + offset, 0.055, 320, 110, 0.17, pan, "fm", 1200);
      this.scheduleVoice(phaseValue + 0.26, 0.18, 2600, 160, 0.12, -pan);
    }
    playBlastCue(x, viewportWidth) {
      this.recordCue("explode", [x, viewportWidth]);
      if (!this.isReady()) return;
      const phaseValue = this.audioTime() + 0.004;
      const pan = this.stereoPosition(x, viewportWidth);
      this.scheduleVoice(phaseValue, 0.2, 4800, 160, 0.22, pan);
      this.scheduleVoice(phaseValue, 0.22, 140, 35, 0.26, pan, "fm", 1100);
      this.scheduleVoice(phaseValue + 0.12, 0.13, 2300, 620, 0.08, -pan);
    }
    playOpeningCue() {
      this.recordCue("intro", []);
      if (!this.isReady()) return;
      const phaseValue = this.audioTime() + 0.01;
      this.scheduleVoice(phaseValue, 0.48, 180, 6400, 0.24, -0.7);
      this.scheduleVoice(phaseValue + 0.17, 0.32, 2700, 110, 0.15, 0.7, "fm", 1900);
      this.scheduleVoice(phaseValue + 0.4, 0.2, 95, 34, 0.3, 0, "fm", 70);
    }
    begin() {
      this.recordCue("start", []);
      if (!this.isReady()) return;
      const phaseValue = this.audioTime() + 0.004;
      this.scheduleVoice(phaseValue, 0.22, 150, 36, 0.36, 0, "fm", 140);
      for (let indexValue = 0; indexValue < 7; indexValue++)
        this.scheduleVoice(
          phaseValue + indexValue * 0.035,
          0.075,
          500 + indexValue * 430,
          5400 - indexValue * 340,
          0.1,
          -0.8 + indexValue * 0.26,
          "fm",
          1100,
        );
    }
    playCompletionCue() {
      this.recordCue("finale", []);
      if (!this.isReady()) return;
      const phaseValue = this.audioTime() + 0.004;
      this.scheduleVoice(phaseValue, 0.3, 5400, 220, 0.2, 0.8);
      this.scheduleVoice(phaseValue + 0.05, 0.3, 4300, 180, 0.18, -0.8);
      this.scheduleVoice(phaseValue + 0.24, 0.38, 105, 30, 0.36, 0, "fm", 200);
      this.scheduleVoice(phaseValue + 0.28, 0.16, 1500, 600, 0.12, 0, "fm", 2600);
    }
    playReleaseCue() {
      this.recordCue("release", []);
      if (!this.isReady()) return;
      const phaseValue = this.audioTime() + 0.004;
      this.scheduleVoice(phaseValue, 0.32, 3600, 100, 0.18);
      this.scheduleVoice(phaseValue + 0.1, 0.28, 140, 28, 0.25, 0, "fm", 240);
    }
    closeAudio(after = 0) {
      if (!this.ctx || this.renderClock != null) return;
      const audioContext = this.ctx;
      const phaseValue = audioContext.currentTime;
      this.out.gain.cancelScheduledValues(phaseValue);
      this.out.gain.setValueAtTime(this.out.gain.value, phaseValue);
      this.out.gain.linearRampToValueAtTime(0, phaseValue + Math.max(0.05, after));
      setTimeout(() => audioContext.close().catch(() => {}), (after + 0.2) * 1000);
    }
  }
  function exposeHoverLabelsForCapture() {
    const saved = [];
    for (const element of document.querySelectorAll(
      '[class~="group-hover:opacity-100"][class~="pointer-events-none"]',
    )) {
      if (getComputedStyle(element).mixBlendMode !== "difference" || element.children.length !== 3) continue;
      if (![...element.children].every((child) => getComputedStyle(child).backgroundClip === "text"))
        continue;
      saved.push([element, element.getAttribute("style")]);
      element.style.setProperty("transition", "none", "important");
      element.style.setProperty("opacity", "1", "important");
    }
    return () => {
      for (const [element, style] of saved) {
        if (style == null) element.removeAttribute("style");
        else element.setAttribute("style", style);
      }
    };
  }
  /* Coordinate capture, rendering, user input and cancellation as one session.*/
  class AnimationSession {
    constructor() {
      this.disposed = false;
      this.createdAt = performance.now();
      this.autoTour = false;
      this.tourVelocity = 0;
      this.tourDistance = 0;
      this.playbackRates = [1, 2, 3];
      this.playbackRateIndex = 0;
      this.complete = false;
      this.startupTimings = {};
    }
    async readScreenshot() {
      let sourceElement = window.__smartRobotScreenshot;
      window.__smartRobotScreenshot = null;
      if (sourceElement)
        cachedScreenshot = {
          src: sourceElement,
          at: this.scrollContext.geom(),
        };
      else if (cachedScreenshot) sourceElement = cachedScreenshot.src;
      if (!sourceElement) return null;
      const imageElement = new Image();
      imageElement.src = sourceElement;
      try {
        await imageElement.decode();
      } catch (ignoredError) {
        return null;
      }
      const alignmentGuide =
        cachedScreenshot && cachedScreenshot.src === sourceElement
          ? cachedScreenshot.at
          : this.scrollContext.geom();
      return {
        img: imageElement,
        sx: alignmentGuide.sx,
        sy: alignmentGuide.sy,
        scale: imageElement.naturalWidth / innerWidth,
        valid: false,
      };
    }
    async execute() {
      this.scrollContext = inspectScrollContext();
      const shotP = this.readScreenshot();
      this.surface = new SceneSurface(this.scrollContext);
      this.orchestrator = new RobotOrchestrator(this.surface);
      this.audioRack = new CyberAudioRack();
      this.audioRack.initializeAudio();
      this.orchestrator.audioRack = this.audioRack;
      this.orchestrator.afterCompletion = () => this.afterCompletion();
      this.attachInputHandlers();
      this.last = performance.now();
      this.animationRequest = requestAnimationFrame((job) => this.advanceFrame(job));
      await awaitPaint();
      this.refreshAudioButton();
      this.audioRack.playOpeningCue();
      this.surface.bg.classList.add("on");
      this.surface.controlBar.style.display = "none";
      const mark = (slot) => (this.startupTimings[slot] = Math.round(performance.now() - this.createdAt));
      await delayFor(520);
      await releaseCaptureVisibility();
      mark("blank");
      if (this.disposed) return;
      await this.primeLazyContent();
      mark("scan");
      if (this.disposed) return;
      try {
        await Promise.race([document.fonts.ready, delayFor(1200)]);
      } catch (ignoredError) {}
      mark("fonts");
      await this.awaitCaptureReadiness();
      if (this.disposed) return;
      this.surface.refreshViewport();
      const screenshot = await shotP;
      if (screenshot) {
        const alignmentGuide = this.scrollContext.geom();
        screenshot.valid =
          Math.abs(alignmentGuide.sx - screenshot.sx) < 1 && Math.abs(alignmentGuide.sy - screenshot.sy) < 1;
      }
      let model;
      const restoreLabels = exposeHoverLabelsForCapture();
      try {
        model = collectPageBlueprint(this.scrollContext, screenshot);
      } catch (err) {
        console.error("[robot-animation-stage] capture failed", err);
        model = {
          fragments: [],
          jobs: [],
          repeatedComponents: [],
          alignmentGuides: [],
          docW: 0,
          docH: 0,
        };
      } finally {
        restoreLabels();
      }
      mark("capture");
      if (this.disposed) return;
      this.surface.attachBlueprint(model);
      this.orchestrator.loadBlueprint(model);
      this.blueprint = model;
      mark("mount");
      if (this.disposed) return;
      this.orchestrator.begin();
    }
    async awaitCaptureReadiness() {
      const pending = [...document.images]
        .filter((imageElement) => !imageElement.closest("robot-animation-stage"))
        .map((imageElement) => imageElement.decode().catch(() => {}));
      for (const animation of document.getAnimations()) {
        const end = animation.effect && animation.effect.getComputedTiming().finishedAt;
        if (animation.playState === "running" && Number.isFinite(end) && end <= 1500) {
          pending.push(animation.finished.catch(() => {}));
        }
      }
      await Promise.race([Promise.all(pending), delayFor(1500)]);
      await awaitPaint();
    }
    async primeLazyContent() {
      const scrollContext = this.scrollContext;
      const alignmentGuide = scrollContext.geom();
      const surfaceHeight = scrollContext.scrollHeight();
      if (surfaceHeight <= alignmentGuide.vh * 1.25) return;
      this.surface.lockedViewport = {
        ...this.surface.viewportState,
      };
      const steps = Math.min(28, Math.ceil(surfaceHeight / (alignmentGuide.vh * 0.85)));
      for (let indexValue = 1; indexValue <= steps && !this.disposed; indexValue++) {
        scrollContext.scrollTo(Math.min(surfaceHeight, (surfaceHeight / steps) * indexValue));
        await awaitPaint();
        await delayFor(30);
      }
      scrollContext.scrollTo(alignmentGuide.sy, alignmentGuide.sx);
      await awaitPaint();
      await delayFor(750);
      scrollContext.scrollTo(alignmentGuide.sy, alignmentGuide.sx);
      this.surface.lockedViewport = null;
    }
    attachInputHandlers() {
      const on = (phaseValue, ev, fn, travelOptions) => {
        phaseValue.addEventListener(ev, fn, travelOptions);
        (this.eventDisposers || (this.eventDisposers = [])).push(() =>
          phaseValue.removeEventListener(ev, fn, travelOptions),
        );
      };
      const scrollTarget = this.scrollContext.isRoot ? window : this.scrollContext.scroller;
      on(
        scrollTarget,
        "scroll",
        () => {
          if (!this.surface.lockedViewport) this.surface.syncDocumentPosition();
        },
        {
          passive: true,
        },
      );
      on(window, "resize", () => this.surface.refreshViewport());
      on(
        window,
        "wheel",
        () => {
          if (this.orchestrator.isReady) this.orchestrator.begin();
        },
        {
          passive: true,
        },
      );
      on(
        window,
        "pointermove",
        (e) => {
          window.__smartRobotPointer = this.orchestrator.mouse = {
            x: e.clientX,
            y: e.clientY,
          };
        },
        {
          capture: true,
          passive: true,
        },
      );
      on(
        window,
        "keydown",
        (e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            endAnimation(false);
          } else if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
            this.audioRack.setAudioEnabled(!this.audioRack.on);
            this.refreshAudioButton();
          }
          this.unlockAudio();
        },
        true,
      );
      on(window, "pointerdown", () => this.unlockAudio(), true);
      if (!this.scrollContext.isRoot) {
        on(
          this.surface.host,
          "wheel",
          (e) => {
            e.preventDefault();
            this.scrollContext.scroller.scrollBy({
              top: e.deltaY,
              left: e.deltaX,
              behavior: "instant",
            });
          },
          {
            passive: false,
          },
        );
      }
      on(this.surface.controlBar, "click", (e) => {
        const secondValue = e.target.closest("button");
        if (!secondValue) return;
        const firstValue = secondValue.dataset.a;
        if (firstValue === "close") endAnimation(false);
        else if (firstValue === "live") endAnimation(true);
        else if (firstValue === "replay") replayAnimation();
        else if (firstValue === "tour") {
          this.autoTour = !this.autoTour;
          secondValue.classList.toggle("on", this.autoTour);
          secondValue.textContent = this.autoTour ? "Touring" : "Tour";
          if (this.autoTour) this.orchestrator.begin();
        } else if (firstValue === "sound") {
          if (this.audioRack.on && this.audioRack.needsAudioGesture) this.audioRack.resumeAudio();
          else this.audioRack.setAudioEnabled(!this.audioRack.on);
          setTimeout(() => this.refreshAudioButton(), 60);
        } else if (firstValue === "speed") {
          this.playbackRateIndex = (this.playbackRateIndex + 1) % this.playbackRates.length;
          this.orchestrator.speed = this.playbackRates[this.playbackRateIndex];
          secondValue.textContent = this.playbackRates[this.playbackRateIndex] + "×";
        }
      });
    }
    unlockAudio() {
      if (this.disposed || !this.audioRack || !this.audioRack.needsAudioGesture) return;
      this.audioRack.resumeAudio();
      setTimeout(() => this.refreshAudioButton(), 80);
    }
    refreshAudioButton() {
      const secondValue = this.surface.root.querySelector('[data-a="sound"]');
      if (!secondValue || !this.audioRack) return;
      const tap = this.audioRack.on && this.audioRack.needsAudioGesture;
      const key = this.audioRack.on ? (tap ? "tap" : "on") : "off";
      if (secondValue._k === key) return;
      secondValue._k = key;
      secondValue.classList.toggle("off", key === "off");
      secondValue.classList.toggle("tap", tap);
      const waves = '<path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8"/>';
      const mute = '<path d="M11 6l4 4M15 6l-4 4"/>';
      secondValue.innerHTML = `${AUDIO_BUTTON_GLYPH}${key === "off" ? mute : waves}</svg>${tap ? "<span>Tap for sound</span>" : ""}`;
      secondValue.title = key === "off" ? "Sound off (M)" : "Sound on (M)";
    }
    advanceFrame(now) {
      if (this.disposed) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      try {
        this.orchestrator.includeOffscreenWork = this.autoTour;
        this.orchestrator.advanceSimulation(dt);
        if (this.autoTour) this.advanceTour(dt);
        this.surface.paintFrame(this.orchestrator);
        if (
          this.complete &&
          this.orchestrator.robots.length === 0 &&
          this.orchestrator.activeBlasts.length === 0
        ) {
          endAnimation(false);
          return;
        }
        if (!this.lastControlUpdate || now - this.lastControlUpdate > 200) {
          this.lastControlUpdate = now;
          this.refreshControls();
          this.refreshAudioButton();
        }
      } catch (err) {
        console.error("[robot-animation-stage]", err);
      }
      this.animationRequest = requestAnimationFrame((phaseValue) => this.advanceFrame(phaseValue));
    }
    advanceTour(dt) {
      const orchestrator = this.orchestrator;
      if (!orchestrator.started) return;
      const alignmentGuide = this.scrollContext.geom();
      const maxY = this.scrollContext.scrollHeight() - alignmentGuide.vh;
      if (alignmentGuide.sy >= maxY - 1) {
        this.tourVelocity = 0;
        return;
      }
      const crew = Math.max(
        CREW_MINIMUM,
        orchestrator.robots.filter((candidate) => !candidate.departing).length,
      );
      const backlog = orchestrator.unfinishedJobCount();
      const target = backlog <= Math.max(4, crew * 0.6) ? 230 : backlog <= crew * 1.5 ? 80 : 0;
      this.tourVelocity += (target - this.tourVelocity) * Math.min(1, dt * 2.5);
      this.tourDistance += this.tourVelocity * dt;
      if (this.tourDistance >= 1) {
        const nodeValue = Math.floor(this.tourDistance);
        this.tourDistance -= nodeValue;
        this.scrollContext.scrollBy(nodeValue);
      }
    }
    refreshControls() {
      const orchestrator = this.orchestrator;
      const sceneSurface = this.surface;
      if (!orchestrator.isReady) return;
      const workers =
        orchestrator.robots.filter((candidate) => candidate.hasWorked).length + orchestrator.retiredRobots;
      const total = orchestrator.jobs.length;
      const done = orchestrator.finishedJobs;
      if (this.complete) return;
      if (!orchestrator.started)
        sceneSurface.status.innerHTML = `<b>${orchestrator.robots.length}</b> agents ready<span class="sep"></span>${total.toLocaleString()} layers`;
      else {
        const pend = orchestrator.jobs.length - done;
        const below = orchestrator.jobs.some(
          (phaseValue) =>
            phaseValue.state === "wait" &&
            phaseValue.layer === "world" &&
            phaseValue.gate > orchestrator.unlockedBottom,
        );
        sceneSurface.status.innerHTML =
          `<b>${workers}</b> agents<span class="sep"></span><b>${done.toLocaleString()}</b> / ${total.toLocaleString()} layers` +
          (below && pend && !this.autoTour && orchestrator.unfinishedJobCount() === 0
            ? `<span class="sep"></span>scroll to keep building`
            : "");
      }
      sceneSurface.progressFill.style.width = total ? `${(done / total) * 100}%` : "0%";
      const busy = orchestrator.robots.filter((candidate) => candidate.assignment).slice(-5);
      const key = busy.map((candidate) => candidate.id).join(",");
      if (key !== this.lastCrewDisplay) {
        this.lastCrewDisplay = key;
        sceneSurface.crewIndicators.innerHTML = busy
          .map(
            (candidate) =>
              `<i style="background:${candidate.color}" title="${candidate.name}">${candidate.name[0]}</i>`,
          )
          .join("");
      }
    }
    afterCompletion() {
      this.complete = true;
      if (this.audioRack) this.audioRack.playCompletionCue();
      const orchestrator = this.orchestrator;
      const sceneSurface = this.surface;
      const workers =
        orchestrator.robots.filter((candidate) => candidate.hasWorked).length + orchestrator.retiredRobots;
      const secs = (orchestrator.finishedAt - orchestrator.startedAt).toFixed(1);
      sceneSurface.status.innerHTML = `Rebuilt by <b>${workers}</b> agents in <b>${secs}s</b>`;
      sceneSurface.progressFill.style.width = "100%";
      sceneSurface.crewIndicators.innerHTML = "";
      sceneSurface.root.querySelector('[data-a="live"]').hidden = false;
      sceneSurface.root.querySelector('[data-a="replay"]').hidden = false;
      sceneSurface.root.querySelector('[data-a="tour"]').hidden = true;
      sceneSurface.root.querySelector('[data-a="speed"]').hidden = true;
      this.autoTour = false;
    }
    disposeSession(fadeToPage) {
      releaseCaptureVisibility();
      if (this.audioRack) {
        if (fadeToPage) this.audioRack.playReleaseCue();
        this.audioRack.closeAudio(fadeToPage ? 1.4 : 0.25);
      }
      const finish = () => {
        this.disposed = true;
        cancelAnimationFrame(this.animationRequest);
        for (const segment of this.eventDisposers || []) segment();
        this.surface.host.remove();
      };
      if (fadeToPage) {
        this.orchestrator.releasing = true;
        this.orchestrator.returningCrew = true;
        for (const candidate of this.orchestrator.robots) {
          candidate.routine = null;
          candidate.recalling = false;
        }
        this.surface.controlBar.classList.remove("on");
        setTimeout(() => {
          this.surface.host.style.setProperty("opacity", "0", "important");
        }, 450);
        setTimeout(finish, 1150);
      } else {
        this.surface.host.style.setProperty("transition", "opacity .25s ease", "important");
        this.surface.host.style.setProperty("opacity", "0", "important");
        this.disposed = true;
        cancelAnimationFrame(this.animationRequest);
        for (const segment of this.eventDisposers || []) segment();
        setTimeout(() => this.surface.host.remove(), 260);
      }
    }
  }
  async function releaseCaptureVisibility() {
    if (!window.__smartRobotCaptureHidden) return;
    window.__smartRobotCaptureHidden = false;
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage)
        await chrome.runtime.sendMessage({
          type: "robot-animation:restore-page",
        });
    } catch (ignoredError) {}
    if (typeof window.__smartRobotRestorePage === "function") {
      try {
        window.__smartRobotRestorePage();
      } catch (ignoredError) {}
    }
    await awaitPaint();
  }
  let currentSession = null;
  let cachedScreenshot = null;
  function launchAnimation() {
    if (currentSession) return;
    currentSession = new AnimationSession();
    currentSession.execute().catch((err) => console.error("[robot-animation-stage]", err));
  }
  function endAnimation(fadeToPage) {
    if (!currentSession) return;
    const firstValue = currentSession;
    currentSession = null;
    firstValue.disposeSession(fadeToPage);
  }
  function replayAnimation() {
    if (currentSession) {
      const firstValue = currentSession;
      currentSession = null;
      firstValue.disposed = true;
      cancelAnimationFrame(firstValue.animationRequest);
      for (const segment of firstValue.eventDisposers || []) segment();
      firstValue.surface.host.remove();
      if (firstValue.audioRack) firstValue.audioRack.closeAudio(0.1);
      if (cachedScreenshot) firstValue.scrollContext.scrollTo(cachedScreenshot.at.sy, cachedScreenshot.at.sx);
    }
    launchAnimation();
  }
  window[SESSION_HANDLE] = {
    togglePlayback() {
      if (currentSession) endAnimation(false);
      else launchAnimation();
    },
    start: launchAnimation,
    stop: endAnimation,
    get session() {
      return currentSession;
    },
    diagnostics: {
      collectPageBlueprint: collectPageBlueprint,
      inspectScrollContext: inspectScrollContext,
      CyberAudioRack: CyberAudioRack,
    },
  };
  launchAnimation();
})();
