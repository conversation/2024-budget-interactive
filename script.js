const fillColours = [
  "#990a00", // heavy cuts
  "#d8352a", // medium cuts
  "#e9928c", // light cuts
  "#93939f", // no/minimal change
  "#8ce4c8", // light spend
  "#40bf95", // medium spend
  "#1f7a5c", // heavy spend
];

const strokeColours = [
  "#3d0400", // heavy cuts
  "#990a00", // medium cuts
  "#d8352a", // light cuts
  "#62626a", // no/minimal change
  "#40bf95", // light spend
  "#1f7a5c", // medium spend
  "#052e20", // heavy spend
];

const hexToRgb = (hex) =>
  hex
    .replace(
      /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
      (m, r, g, b) => "#" + r + r + g + g + b + b
    )
    .substring(1)
    .match(/.{2}/g)
    .map((x) => parseInt(x, 16));

const convertToBillions = (value) => {
  return value / 1000000000;
};

function buildAllCharts(data) {
  let width, height, margin;
  let bubbles, bubbleSimulation, bars, fiscalBubbleSimulation;
  // let quants = [-100, -50, -25, 0, 25, 50, 100];
  let quants = [-0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5];
  let radiusScale;
  let colourLegend;
  let chart1ColourAndYScale,
    chart1CircleRadius,
    chart1CenterX,
    chart1CenterY,
    chart1YPositions,
    chart1Legend;
  let chart2Legend,
    chart2CircleRadius,
    chart2ColourScale,
    chart2CenterY,
    chart2RadiusScale,
    fiscalBubbles,
    chart2XScale,
    chart2BubbleScale;
  let chart3Legend, chart3XScale, chart3YScale;
  let chart4GridPositions, chart4Legend;
  let maxHeight =
    document.body.clientWidth * 0.6 < 500
      ? 500
      : document.body.clientWidth * 0.6;

  function getHeight() {
    return document.body.clientWidth * 0.6 < 500
      ? 400
      : document.body.clientWidth * 0.5;
  }

  let departments = data.departments
    .sort((a, b) => a.budget_2023 - b.budget_2024)
    .map((department) => ({
      department: department.department,
      short_label: department.short_label,
    }));

  const chartWrapper = d3.select(".chart_wrapper");

  width = document.querySelector(".chart_wrapper").clientWidth;
  height = (document.querySelector(".chart_wrapper").clientWidth / 16) * 9;

  chartWrapper.selectAll("svg").remove();

  const tooltip = d3.select(".tooltip");

  tooltip.style("display", "none").style("opacity", 0);

  // Create container elements
  const svg = chartWrapper.append("svg");
  const bubbleContainer = svg.append("g").attr("class", "bubble_container");
  const fiscalBubbleContainer = svg
    .append("g")
    .attr("class", "fiscal_bubble_container");
  const barContainer = svg.append("g").attr("class", "bar_container");

  function buildScales() {
    width = document.querySelector(".chart_wrapper").clientWidth;
    height =
      window.innerWidth < 599
        ? document.querySelector(".chart_wrapper").clientHeight
        : (document.querySelector(".chart_wrapper").clientWidth / 16) * 9;

    // Create SVG element
    svg.attr("width", width).attr("height", height);

    // Declare the variables.
    margin = { top: 70, right: 20, bottom: 100, left: 50 };

    // returns a [min, max] arraw for a radius range
    function getRadius() {
      return [
        width < 599 ? 3 : 5,
        width > 1000
          ? (width - margin.left - margin.right) * 0.4
          : height - margin.top - margin.bottom,
      ];
    }

    // All charts
    radiusScale = d3
      // .scaleSqrt()
      .scaleLinear()
      .domain([0, data.total.budget_2024])
      .range(getRadius());

    // Chart 1
    chart1ColourAndYScale = d3
      .scaleQuantile()
      .domain(quants)
      .range([0, 1, 2, 3, 4, 5, 6]);

    chart1CircleRadius = radiusScale(data.total.budget_2024 / 2); // Static circle radius
    chart1CenterX = width / 2;
    chart1CenterY = height / 2;

    chart1YPositions = [
      chart1CenterY + chart1CircleRadius, // heavy cuts
      chart1CenterY + chart1CircleRadius * 0.66, // medium cuts
      chart1CenterY + chart1CircleRadius * 0.33, // light cuts
      chart1CenterY, // no/minimal change
      chart1CenterY - chart1CircleRadius * 0.33, // light spend
      chart1CenterY - chart1CircleRadius * 0.66, // medium spend
      chart1CenterY - chart1CircleRadius, // heavy spend
    ];

    // Chart 2
    chart2RadiusScale = d3
      .scaleLinear()
      .domain(d3.extent(data.fiscal.GDP.slice(0, 3), (d) => d.value))
      .range([getRadius()[0], getRadius()[1] / 4]);

    chart2CircleRadius = chart2RadiusScale(
      Math.max(...data.fiscal.GDP.map((el) => el.value))
    );

    chart2CenterY = height / 3;

    chart2XScale = (i) => (width / 4) * i + width / 8;

    chart2BubbleScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([getRadius()[0], getRadius()[1] / 5]);

    chart2ColourScale = d3
      .scaleLinear()
      .domain(d3.extent(data.fiscal.decisions.slice(3), (d) => d.value))
      .range([fillColours[2], fillColours[fillColours.length - 2]]);

    // Chart 3
    chart3XScale = d3
      .scaleBand()
      .padding(0.5)
      .align(0.5)
      .domain(data.departments.map((d) => d.department).sort())
      .range([margin.left, width - margin.right]);

    chart3YScale = d3
      .scaleLinear()
      .domain(d3.extent(data.programs, (d) => d.change).reverse())
      .range([margin.top, height - 40]);

    // Chart 4
    let numRows = 4;
    let numCols = 4;
    let cellWidth = width / numCols;
    let cellHeight = (height - margin.top - (width < 599 ? 50 : 70)) / numRows;

    chart4GridPositions = {};

    departments.forEach((dept, index) => {
      let row = Math.floor(index / numRows);
      let col = index % numCols;

      if (dept.department === "Defence" && height < width) {
        row = 3;
        col = 2;
      }

      if (dept.department === "Social Security And Welfare" && height < width) {
        row = 2.7;
        col = 1;
      }

      chart4GridPositions[dept.department] = {
        x: col * cellWidth + cellWidth / 2,
        y: row * cellHeight + cellHeight / 2,
      };
    });
  }

  function buildBubbles() {
    data.programs.forEach((d) => {
      d.x = width / 2;
      d.y = chart1YPositions[chart1ColourAndYScale(d.change)];
    });

    // Define colors using CSS variables or directly in JS
    const colourDarkGov = getComputedStyle(document.documentElement)
      .getPropertyValue("--yellow-600")
      .trim();
    const colourLightGov = getComputedStyle(document.documentElement)
      .getPropertyValue("--yellow-50")
      .trim();
    const colourDarkExt = getComputedStyle(document.documentElement)
      .getPropertyValue("--blue-600")
      .trim();
    const colourLightExt = getComputedStyle(document.documentElement)
      .getPropertyValue("--blue-50")
      .trim();

    // Define the pattern
    const patternGov = svg
      .append("defs")
      .append("pattern")
      .attr("id", "gradientPatternGov")
      .attr("width", 10) // Adjust pattern size as needed
      .attr("height", 10)
      .attr("patternTransform", "rotate(45)") // Rotate pattern to simulate 45deg gradient
      .attr("patternUnits", "userSpaceOnUse");

    // First part of the pattern
    patternGov
      .append("rect")
      .attr("width", 5)
      .attr("height", 10)
      .attr("fill", colourDarkGov);

    // Second part of the pattern
    patternGov
      .append("rect")
      .attr("x", 5) // Positioning it right after the first rectangle
      .attr("width", 5)
      .attr("height", 10)
      .attr("fill", colourLightGov);

    // Define the pattern
    const patternExt = svg
      .append("defs")
      .append("pattern")
      .attr("id", "gradientPatternExt")
      .attr("width", 10) // Adjust pattern size as needed
      .attr("height", 10)
      .attr("patternTransform", "rotate(-45)") // Rotate pattern to simulate 45deg gradient
      .attr("patternUnits", "userSpaceOnUse");

    // First part of the pattern
    patternExt
      .append("rect")
      .attr("width", 5)
      .attr("height", 10)
      .attr("fill", colourDarkExt);

    // Second part of the pattern
    patternExt
      .append("rect")
      .attr("x", 5) // Positioning it right after the first rectangle
      .attr("width", 5)
      .attr("height", 10)
      .attr("fill", colourLightExt);

    fiscalBubbles = fiscalBubbleContainer
      .selectAll(".bubble")
      .data(data.fiscal.decisions)
      .enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", (_, i) => chart2XScale(i < 4 ? i % 2 === 0 : i - 2))
      .attr("cy", chart2CenterY)
      .style("fill", (d, i) => {
        if (i < 4) {
          return i < 2
            ? "url(#gradientPatternGov)"
            : "url(#gradientPatternExt)";
        } else if (i === 4) {
          return d.value < 0
            ? fillColours[1]
            : fillColours[fillColours.length - 2];
        } else {
          return "#4b4b4e";
        }
      })
      .attr("stroke", "#93939f")
      .attr("stroke-width", 0.5)
      .on("mouseover", showTooltip)
      .on("mousemove", moveTooltip)
      .on("mouseclick", showTooltip)
      .on("mouseleave", hideTooltip)
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    // Add circles for each data point
    bubbles = bubbleContainer
      .selectAll(".bubble")
      .data(data.programs)
      .enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", width / 2)
      .attr("cy", (d) => chart1YPositions[chart1ColourAndYScale(d.change)])
      .attr("fill", (d) =>
        d.budget_2024 < 0
          ? "#fff"
          : fillColours[chart1ColourAndYScale(d.change)]
      )
      .attr("stroke", (d) =>
        d.budget_2024 < 0
          ? "#000"
          : strokeColours[chart1ColourAndYScale(d.change)]
      )
      .attr("stroke-width", 0.5)
      .style("stroke-dasharray", (d) => (d.budget_2024 < 0 ? 2 : 0))
      .on("mouseover", showTooltip)
      .on("click", () => console.log("test"))
      .on("mousemove", moveTooltip)
      .on("mouseleave", hideTooltip)
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    function dragstarted(event, d) {
      if (!event.active) bubbleSimulation.restart();
      d.fx = d.x;
      d.fy = d.y;
      hideTooltip();
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
      hideTooltip();
    }
    function dragended(event, d) {
      if (!event.active) bubbleSimulation.alphaTarget(0.01);
      d.fx = null;
      d.fy = null;
    }

    // Function to adjust the popup position
    function adjustPopupPosition(event, tooltip) {
      const overflowWidth =
        tooltip.getBoundingClientRect().right - window.innerWidth;

      // tooltip overflows the right edge of the screen
      if (overflowWidth > 0) {
        // Adjust the left position to move the tooltip to the left
        tooltip.style.left = `${
          event.target.cx.animVal.value - overflowWidth
        }px`;
        tooltip.style.top = `${event.pageY + 15}px`; // Lower tooltip a bit so it doesn't cover the mouse
      }
    }
    function generatePopup(d) {
      let colour;

      if (d.change) {
        colour = hexToRgb(fillColours[chart1ColourAndYScale(d.change)]);
      } else {
        colour = [255, 255, 255];
      }

      return `
      <p style="background-color:rgba(${colour[0]},${colour[1]},${
        colour[2]
      },0.5);">
      ${d.sorting ? d.short_label : `Program: ${d.label}`}

      ${
        d.value
          ? `<br>Amount: $${
              d.unit === "m" ? (d.value / 1000).toFixed(2) : d.value.toFixed(2)
            }b`
          : ""
      }

      ${d.department ? `<br>Dept: ${d.department}` : ""}
        

      ${
        d.budget_2024
          ? `<br>Budget:  $${convertToBillions(d.budget_2024).toFixed(2)}b`
          : ""
      }
       

        ${
          d.change ? `<br>Change:  ${d.change ? d.change.toFixed(2) : ""}%` : ""
        }
       
      </p>`;
    }
    function showTooltip(event, d) {
      tooltip
        .style("opacity", 1)
        .style("display", "block")
        .html(generatePopup(d))
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY + 15 + "px");

      adjustPopupPosition(event, tooltip.node());
    }
    function moveTooltip(event) {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY + 15 + "px");
      adjustPopupPosition(event, tooltip.node());
    }
    function hideTooltip() {
      tooltip.style("opacity", 0).style("display", "none");
    }
  }

  function buildBars() {
    bars = barContainer
      .append("g")
      .selectAll("rect")
      .data(data.departments)
      .join("rect")
      .attr(
        "x",
        (d) => chart3XScale(d.department) - chart3XScale.bandwidth() * 0.5
      )
      .attr("y", (d) => chart3YScale(Math.max(0, d.change)))
      .attr("width", chart3XScale.bandwidth())
      .attr("height", (d) => Math.abs(chart3YScale(d.change) - chart3YScale(0)))
      .attr("fill", (d) => fillColours[chart1ColourAndYScale(d.change)])
      .style("pointer-events", "none")
      .attr("stroke-width", 1)
      .style("stroke", "black")
      .style("stroke-dasharray", 2)
      .style("opacity", 0);
  }

  function buildSimulation() {
    // Assuming yScale and radiusScale functions are defined based on your data
    bubbleSimulation = d3
      .forceSimulation(data.programs)
      .alphaDecay(0.1) // Default is 0.0228, lower it to slow the cooling down
      .alphaTarget(0.01) // Stay hot
      .velocityDecay(0.4); // Friction

    fiscalBubbleSimulation = d3
      .forceSimulation(data.fiscal.decisions)
      .alphaDecay(0.1) // Default is 0.0228, lower it to slow the cooling down
      .alphaTarget(0.01) // Stay hot
      .velocityDecay(0.4); // Friction
  }

  function buildChart1() {
    clearLegends(0);
    bars.style("opacity", 0);

    bubbleSimulation
      .restart()
      .alpha(0.15)
      .velocityDecay(0.4) // Friction
      .force(
        "collide",
        d3
          .forceCollide()
          .strength(1)
          .radius((d) => radiusScale(d.budget_2024) * 1.5 + 0.2)
          .iterations(3)
      )
      .force(
        "y",
        d3
          .forceY()
          .strength(6)
          .y((d) => chart1YPositions[chart1ColourAndYScale(d.change)])
      )
      .force("x", null)
      .force(
        "radial",
        d3.forceRadial(0, chart1CenterX, chart1CenterY * 1).strength(0.7)
      )
      .on("tick", () => {
        bubbles // Assuming your nodes are SVG circle elements
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y);
      });

    bubbles
      .transition()
      .delay((d, i) => i * 3)
      .duration(1000)
      .attr("r", (d) => radiusScale(d.budget_2024) * 1.5);
  }

  function buildChart2() {
    clearLegends(1);
    bubbleSimulation.stop();

    fiscalBubbles
      .transition()
      .duration(600)
      .attr("r", (d, i) => {
        if (i < 4) {
          return chart2BubbleScale(
            d.value /
              (i % 2 === 0
                ? data.fiscal.allTotals[0].value
                : data.fiscal.allTotals[1].value)
          );
        } else {
          return chart2RadiusScale(Math.abs(d.value));
        }
      });

    fiscalBubbleSimulation
      .restart()
      .alpha(0.15)
      .velocityDecay(0.4) // Friction
      .force(
        "collide",
        d3
          .forceCollide()
          .strength(1)
          .radius((d, i) => {
            if (i < 4) {
              return (
                chart2BubbleScale(
                  d.value /
                    (i % 2 === 0
                      ? data.fiscal.allTotals[0].value
                      : data.fiscal.allTotals[1].value)
                ) + 0.2
              );
            } else {
              return chart2RadiusScale(Math.abs(d.value)) + 0.2;
            }
          })
          .iterations(3)
      )
      .force("y", d3.forceY().strength(2).y(chart2CenterY))
      .force(
        "x",
        d3
          .forceX()
          .strength(2)
          .x((_, i) => chart2XScale(i < 4 ? i % 2 === 0 : i - 2))
      )
      .force("radial", (_, i) =>
        d3
          .forceRadial(0, chart2XScale(i < 4 ? i % 2 === 0 : i - 2), 40)
          .strength(0.7)
      )
      .on("tick", () => {
        fiscalBubbles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });

    bars.style("opacity", 0);
  }

  function buildChart3() {
    clearLegends(2);
    bars
      .attr(
        "x",
        (d) => chart3XScale(d.department) - chart3XScale.bandwidth() * 0.5
      )
      .transition()
      .duration(200)
      .style("opacity", 0.4);

    bubbleSimulation
      .velocityDecay(0.1) // Friction
      .force("radial", null)
      .force("bound", null)
      .force(
        "collide",
        d3
          .forceCollide()
          .strength(1)
          .radius((d) => (width < 599 ? 2.5 : 5))
          .iterations(3)
      )
      .restart()
      .force(
        "y",
        d3
          .forceY()
          .strength(1.2)
          .y((d) => chart3YScale(d.change))
      )
      .force(
        "x",
        d3
          .forceX()
          .strength(1.2)
          .x((d) => chart3XScale(d.department))
      )

      .on("tick", () => {
        bubbles // Assuming your nodes are SVG circle elements
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y);
      });

    bubbles
      .transition()
      .duration(400)
      .attr("r", width < 599 ? 2.5 : 5);
  }

  function buildChart4() {
    clearLegends(3);
    bars.style("opacity", 0);

    bubbleSimulation
      .restart()
      .velocityDecay(0.2) // Friction
      .force("radial", null)
      .force("center", null)
      .force("bound", null)
      .force(
        "collide",
        d3
          .forceCollide()
          .strength(1)
          .radius((d) => radiusScale(d.budget_2024) + 0.2)
          .iterations(3)
      )
      .force(
        "y",
        d3
          .forceY()
          .strength(1.5)
          .y((d) => chart4GridPositions[d.department].y + 55)
      )
      .force(
        "x",
        d3
          .forceX()
          .strength(1.5)
          .x((d) => chart4GridPositions[d.department].x)
      )
      .on("tick", () =>
        bubbles // Assuming your nodes are SVG circle elements
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
      );

    bubbles
      .transition()
      .delay((d, i) => i * 2)
      .duration(700)
      .attr("r", (d) => radiusScale(d.budget_2024));
  }

  function buildColourLegend() {
    colourLegend = svg.append("g").attr("class", "colour_legend");

    let linear = d3
      .scaleLinear()
      .domain(quants)
      .range([...fillColours]);

    const p = Math.max(0, d3.precisionFixed(0.1));

    let legendLinear = d3
      .legendColor()
      .shapeWidth(30)
      .cells(quants)
      .labels((d) => `${d.generatedLabels[d.i]}%`)
      .orient("horizontal")
      .title("Percent change in spending")
      .titleWidth(200)
      .scale(linear);

    colourLegend.call(legendLinear);

    // Adjust font size
    colourLegend
      .selectAll("text")
      .attr("fill", "#62626a")
      .style("font-size", "10px");

    colourLegend.attr(
      "transform",
      `translate(${
        width / 2 - colourLegend.node().getBoundingClientRect().width / 2
      },10)`
    );

    // Adjust gap between title and shapes
    colourLegend.select(".legendTitle").attr("y", 10);
  }

  function buildChart1Legend() {
    const labels =
      width < 430
        ? [``, "Largest cuts", "Largest spend"]
        : [
            `Total: $${convertToBillions(data.total.budget_2024)}b`,
            "Largest cuts",
            "Largest spend",
          ];

    chart1Legend = svg.append("g").attr("class", "chart1_legend chart_legend");

    const totalBudgetCircle = chart1Legend.append("g");

    // draw total budget circle
    totalBudgetCircle
      .append("circle")
      .attr("cx", chart1CenterX)
      .attr("cy", chart1CenterY)
      .attr("r", chart1CircleRadius)
      .style("fill", "none")
      .style("stroke", "#93939f")
      .style("stroke-dasharray", 4);

    // Add line for the first label
    if (width > 430) {
      totalBudgetCircle
        .append("line")
        .attr("x1", chart1CenterX - chart1CircleRadius)
        .attr("x2", chart1CenterX - chart1CircleRadius - 15)
        .attr("y1", chart1CenterY)
        .attr("y2", chart1CenterY)
        .attr("stroke", "#93939f")
        .style("stroke-dasharray", "2,2");
    }

    // Add line for the second label
    totalBudgetCircle
      .append("line")
      .attr("x1", chart1CenterX)
      .attr("x2", chart1CenterX + chart1CircleRadius)
      .attr("y1", chart1CenterY + chart1CircleRadius)
      .attr("y2", chart1CenterY + chart1CircleRadius)
      .attr("stroke", "#93939f")
      .style("stroke-dasharray", "2,2");

    // Add line for the third label
    totalBudgetCircle
      .append("line")
      .attr("x1", chart1CenterX)
      .attr("x2", chart1CenterX + chart1CircleRadius)
      .attr("y1", chart1CenterY - chart1CircleRadius)
      .attr("y2", chart1CenterY - chart1CircleRadius)
      .attr("stroke", "#93939f")
      .style("stroke-dasharray", "2,2");

    // Add labels
    totalBudgetCircle
      .selectAll("text")
      .data(labels)
      .enter()
      .append("text")
      .attr("x", (_, i) =>
        i === 0
          ? chart1CenterX - chart1CircleRadius - 60
          : chart1CenterX + chart1CircleRadius + 5
      )
      .attr("fill", "#93939f")
      .attr("alignment-baseline", "middle")
      .attr("text-anchor", (d, i) => (i === 0 ? "middle" : "start"))
      .attr("y", (d, i) => {
        if (i === 0) {
          return chart1CenterY;
        } else if (i === 1) {
          return chart1CenterY + chart1CircleRadius;
        } else {
          return chart1CenterY - chart1CircleRadius;
        }
      })
      .text((d) => d)
      .style("font-size", 12);

    const valuesToShow = [50000000000, 25000000000, 5000000000];

    const legendSvg = chart1Legend.append("g");

    legendSvg.append("g").attr("class", "legendSize");

    const legendSize = d3
      .legendSize()
      .title("Amount spent")
      .cells(valuesToShow)
      .labels((d) => `$${convertToBillions(d.generatedLabels[d.i])}b`)
      .scale(radiusScale)
      .shape("circle")
      .shapePadding(10)
      .labelOffset(20)
      .orient("horizontal");

    legendSvg.select(".legendSize").call(legendSize);

    legendSvg
      .selectAll("text")
      .style("font-size", "10px")
      .attr("fill", "#787887");

    // Adjust gap between title and shapes
    legendSvg.select(".legendTitle").attr("y", width < 599 ? 10 : 0);

    // legendSvg.attr("transform", `translate(${0},${80})`);
    legendSvg.attr(
      "transform",
      `translate(
        ${margin.left}
      ,${height - margin.bottom})`
    );
    // legendSvg.attr(
    //   "transform",
    //   `translate(${
    //     width / 2 - legendSvg.node().getBoundingClientRect().width / 2
    //   },${height - margin.bottom})`
    // );
  }

  function buildChart2Legend() {
    chart2Legend = svg.append("g").attr("class", "chart2_legend chart_legend");

    const paymentsCircle = chart2Legend.append("g");
    const paymentsColours = chart2Legend.append("g");
    // .attr("transform", `translate(0,${height - 100})`);

    // draw total budget circle
    paymentsCircle
      .selectAll("circle")
      .data(data.fiscal.GDP)
      .enter()
      .append("circle")
      .attr("cx", (_, i) => chart2XScale(i))
      .attr("cy", chart2CenterY)
      .attr("r", (d) => chart2RadiusScale(Math.abs(d.value)))
      .style("fill", "none")
      .style("stroke", "#787887")
      .style("stroke-dasharray", 4);

    // Add lines connecting labels
    paymentsCircle
      .selectAll("line")
      .data(data.fiscal.GDP)
      .join("line")
      .attr("x1", (_, i) => chart2XScale(i))
      .attr("x2", (_, i) => chart2XScale(i))
      .attr("y1", chart2CenterY + chart2CircleRadius * 1.5)
      .attr("y2", (d) => chart2CenterY + chart2RadiusScale(Math.abs(d.value)))
      .attr("stroke", "#93939f")
      .style("stroke-dasharray", "2,2");

    paymentsCircle
      .selectAll("text")
      .data(data.fiscal.GDP)
      .enter()
      .append("text")
      .attr("x", (_, i) => chart2XScale(i))
      .attr("fill", "#93939f")
      .attr("text-anchor", "middle")
      .attr("y", width > 1000 ? 80 : 40)
      .each(function (d, i) {
        const text = d3.select(this);
        text
          .append("tspan")
          .attr("dy", "-0.5em") // Adjust for better positioning
          .text(i !== 2 ? d.label : d.short_label);

        if (i !== 2) {
          text
            .append("tspan")
            .attr("x", chart2XScale(i))
            .attr("dy", "1.2em") // New line
            .text(`(${d.short_label})`);
        }
      })
      .style("font-size", 14);

    let legendYStart = chart2CenterY + chart2CircleRadius * 1.5 + 16;

    // Add label values
    data.fiscal.GDP.forEach((element, i) => {
      paymentsCircle
        .append("text")
        .attr("x", chart2XScale(i))
        .attr("fill", "#93939f")
        .attr("text-anchor", "middle")
        .attr("y", legendYStart)
        .text(`$${element.value}b`)
        .style("font-size", 14);
    });

    let yShift = 1.4;

    // Draw legend boxes
    paymentsColours
      .append("rect")
      .attr("x", 20)
      .attr("y", legendYStart * yShift)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", "url(#gradientPatternGov)");

    // Draw legend boxes
    paymentsColours
      .append("rect")
      .attr("x", 20)
      .attr("y", legendYStart * yShift + 25)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", "url(#gradientPatternExt)");

    // Draw legend text
    paymentsColours
      .append("text")
      .attr("x", 20)
      .attr("y", legendYStart * yShift - 30)
      .attr("dy", "1rem")
      .style("text-anchor", "start")
      .text(
        "Payment and receipt factors are sized by the % of total since last MYFO"
      )
      .style("font-size", "10px");

    // Draw legend text
    paymentsColours
      .append("text")
      .attr("x", 45)
      .attr("y", legendYStart * yShift - 3)
      .attr("dy", "1rem")
      .style("text-anchor", "start")
      .style("font-size", "13px")
      .text("Due to Government policy, since MYFO");

    // Draw legend text
    paymentsColours
      .append("text")
      .attr("x", 45)
      .attr("y", legendYStart * yShift + 20)
      .attr("dy", "1rem")
      .style("text-anchor", "start")
      .style("font-size", "13px")
      .text("Due to external factors, since MYFO");
  }

  function buildChart3Legend() {
    chart3Legend = svg.append("g").attr("class", "chart3_legend chart_legend");

    chart3Legend
      .append("g")
      .selectAll("line")
      .data(departments)
      .join("line")
      .attr("x1", (d) => chart3XScale(d.department))
      .attr("x2", (d) => chart3XScale(d.department))
      .attr("y1", margin.top)
      .attr("y2", height - 40)
      .attr("stroke", "#93939f")
      .style("stroke-dasharray", "2,2");

    chart3Legend
      .append("g")
      .append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", chart3YScale(0))
      .attr("y2", chart3YScale(0))
      .attr("stroke", "#93939f");

    chart3Legend
      .append("g")
      .selectAll("text")
      .data(departments)
      .enter()
      .append("text")
      .attr("x", (d) => chart3XScale(d.department))
      .attr("y", height - 27)
      .text((d) => d.short_label)
      .attr("text-anchor", "start")
      .attr("transform", (d) => {
        // Calculate the pivot point for rotation
        const x = chart3XScale(d.department);
        const y = height - 30;
        // Return the full transform attribute, including rotation
        return `rotate(25,${x},${y})`;
      })
      .style("font-size", 8);

    chart3Legend
      .append("g")
      .attr("transform", `translate(${margin.left},0)`) // This controls the vertical position of the Axis
      .call(d3.axisLeft(chart3YScale).tickFormat((d) => `${d}%`));
  }

  function buildChart4Legend() {
    chart4Legend = svg
      .append("g")
      .attr("class", "chart4_legend chart_legend")
      .attr("transform", "translate(0,50)");

    // Add legend circles
    chart4Legend
      .selectAll("circle")
      .data(data.departments)
      .enter()
      .append("circle")
      .attr("cx", (d) => chart4GridPositions[d.department].x)
      .attr("cy", (d) => chart4GridPositions[d.department].y + 5)
      .attr("r", (d) => radiusScale(d.budget_2024))
      .style("fill", "none")
      .attr("stroke", "#93939f")
      .style("stroke-dasharray", "1,2");

    // Add labels
    chart4Legend
      .selectAll("text")
      .data(data.departments)
      .enter()
      .append("text")
      .attr("x", (d) => chart4GridPositions[d.department].x)
      .attr("text-anchor", "middle")
      // Removed the .html part for simplicity in this explanation
      .each(function (d) {
        // Use the `each` method to operate on each individual element
        var text = d3.select(this);
        text
          .append("tspan")
          .attr("x", (d) => chart4GridPositions[d.department].x)
          .attr("y", (d) =>
            // chart4GridPositions[d.department].y +
            // radiusScale(d.budget_2024) +
            // 20
            d.department === "Social Security And Welfare"
              ? chart4GridPositions[d.department].y +
                radiusScale(d.budget_2024) +
                (width < 750 ? 20 : -15)
              : chart4GridPositions[d.department].y +
                radiusScale(d.budget_2024) +
                20
          )
          .text(`${d.short_label}:`)
          .attr("fill", "#93939f");
        text
          .append("tspan")
          .attr("x", (d) => chart4GridPositions[d.department].x)
          .attr("dy", "1.2em") // Move the second line down
          .text(`$${(d.budget_2024 / 1000000000).toFixed(1)}b`)
          .attr("fill", "#62626a")
          .style("font-weight", "bold");
      })
      .style("font-size", "10px");
  }

  function buildLegends() {
    buildColourLegend();
    buildChart1Legend();
    buildChart2Legend();
    buildChart3Legend();
    buildChart4Legend();
  }

  function clearLegends(index) {
    if (index === 1) {
      document.querySelector(".colour_legend");
    }

    document.querySelectorAll(".chart_legend").forEach((legend, i) => {
      i === index
        ? legend.classList.add("make_visible")
        : legend.classList.remove("make_visible");
    });

    if (index === 1) {
      bubbleContainer.node().classList.remove("make_visible");
      fiscalBubbleContainer.node().classList.add("make_visible");
      document.querySelector(".colour_legend").classList.remove("make_visible");
      document.querySelector(".chart2_note").classList.add("make_visible");
      document
        .querySelector(".chart2_annotation")
        .classList.add("make_visible");
    } else {
      bubbleContainer.node().classList.add("make_visible");
      fiscalBubbleContainer.node().classList.remove("make_visible");
      document.querySelector(".colour_legend").classList.add("make_visible");
      document.querySelector(".chart2_note").classList.remove("make_visible");
      document
        .querySelector(".chart2_annotation")
        .classList.remove("make_visible");
      fiscalBubbles
        .transition()
        .delay((_, i) => i * 3)
        .duration(1000)
        .attr("r", 0);
    }
  }

  function resize() {
    width = document.body.clientWidth;
    height = getHeight();
    // maxHeight -
    // document.querySelector(".chart_title_container").clientHeight -
    // document.querySelector(".chart_note").clientHeight;

    bars
      .attr(
        "x",
        (d) => chart3XScale(d.department) - chart3XScale.bandwidth() * 0.5
      )
      .attr("y", (d) => chart3YScale(Math.max(0, d.change)))
      .attr("width", chart3XScale.bandwidth())
      .attr("height", (d) =>
        Math.abs(chart3YScale(d.change) - chart3YScale(0))
      );

    buildScales();
    d3.selectAll(".chart_legend").remove();
    d3.selectAll(".colour_legend").remove();
    buildLegends();
  }

  buildScales();
  buildSimulation();
  buildBubbles();
  buildLegends();
  buildBars();

  // Build chart 1 on load
  buildChart1();

  function clearActive() {
    document
      .querySelectorAll(".chart_btn")
      .forEach((btn) => btn.classList.remove("active"));
  }

  let activeChart = 1;

  const largestDeptChangePercent = data.departments.reduce((prev, current) => {
    return current.change > prev.change ? current : prev;
  });

  const largestProgramChangePercent = data.programs.reduce((prev, current) => {
    return current.change > prev.change ? current : prev;
  });

  const smallestProgramChangePercent = data.programs.reduce((prev, current) => {
    return current.change < prev.change ? current : prev;
  });

  const chartDescription = document.querySelector(".chart_description");

  document.querySelector("#chart1").addEventListener("click", (event) => {
    // chartDescription.style.minHeight = "0";
    chartDescription.textContent =
      "The coloured bubbles here represent the program expenses funded in the 2024-25 budget. The circle size represent the program's budget in billions of dollars and the colour shows the change since last budget.";
    buildChart1();
    clearActive();
    event.target.classList.add("active");
    activeChart = 1;
  });
  document.querySelector("#chart2").addEventListener("click", (event) => {
    chartDescription.textContent =
      "This chart shows the overall fiscal outlook for the coming year, including the underlying cash balance - which tells us if we have a 'surplus' or 'defecit'. However, when we look at the payments and receipts we can see what factors played a bigger role. The orange stripes show amounts caused by Government policy (like raising/lowering taxes), the blue stripes are amounts caused by external factors (like iron ore prices skyrocketing).";
    // Payments are spending, such as buying military equipment, and receipts means they earned money, like individual taxation or earnings from the Future Funt - the underlying cash balance is essentially the receipts minus payments.
    buildChart2();
    clearActive();
    event.target.classList.add("active");
    activeChart = 2;
  });
  document.querySelector("#chart3").addEventListener("click", (event) => {
    chartDescription.textContent = `The department program cirlces have been reduced and we can now see the breakdown of all the cuts and spends. The bars show how much the entire department is projected to grow or shink in 2024-25. The ${
      largestProgramChangePercent.short_label
    } program sees the biggest changes (${largestProgramChangePercent.change.toFixed(
      2
    )}%), while outliers such as the ${
      smallestProgramChangePercent.short_label
    } program (${smallestProgramChangePercent.change.toFixed(
      2
    )}%) skew the totals.`;
    buildChart3();
    clearActive();
    event.target.classList.add("active");
    activeChart = 3;
  });
  document.querySelector("#chart4").addEventListener("click", (event) => {
    // chartDescription.style.minHeight = "8rem";
    chartDescription.textContent = `Departmental spending for 2024-25 are shown by the outlined dotted circle. As always, Social welfare is the largest department. A notable change is the ${
      largestDeptChangePercent.short_label
    } department, with a boost of $${(
      (largestDeptChangePercent.budget_2024 -
        largestDeptChangePercent.budget_2023) /
      1000000000
    ).toFixed(2)}b.`;
    buildChart4();
    clearActive();
    event.target.classList.add("active");
    activeChart = 4;
  });

  window.addEventListener("resize", () => {
    resize();
    switch (activeChart) {
      case 1:
        buildChart1();
        break;
      case 2:
        buildChart2();
        break;
      case 3:
        buildChart3();
        break;
      case 4:
        buildChart4();
        break;

      default:
        break;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const files = [
    "./data/programs.csv",
    "./data/departments.csv",
    "./data/fiscal.csv",
    "./data/totals.csv",
  ];

  const promises = files.map((file) => d3.csv(file, d3.autoType));

  Promise.all(promises)
    .then(([programs, departments, fiscal, totals]) => {
      function generateChange(prev, curr) {
        return prev === 0 ? null : (curr - prev) / ((curr + prev) / 2);
      }

      function convertToBaseValue(el) {
        el.budget_2023 *= 1000000;
        el.budget_2024 *= 1000000;
        el.change = generateChange(el.budget_2023, el.budget_2024);
        return el;
      }

      const budgetData = {};

      budgetData.programs = programs.map(convertToBaseValue);
      budgetData.departments = departments.map(convertToBaseValue);
      budgetData.fiscal = {
        individualTotals: fiscal.filter((a) => a.type === "individualTotals"),
        allTotals: fiscal.filter((a) => a.type === "allTotals"),
        decisions: fiscal.filter((a) => a.type === "decisions"),
        GDP: fiscal.filter((a) => a.type === "GDP"),
      };
      budgetData.total = totals[0];

      buildAllCharts(budgetData);
    })
    .catch((error) => {
      console.log("Error loading files:", error);
    });

  // buildAllCharts();
  new pym.Child({ polling: 10 });
});
