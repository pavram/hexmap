$(document).ready(() => {

  
  let MAP_PIECES = [];
  let MAP_PIECES_REMAINING = [];
  let MAP_PIECES_ADDED = [];

  let MAP_PIECES_GOOD = [];
  let MAP_PIECES_DEAD = [];
  let MAP_PIECES_LIVE = [];

  let CURRENT_MAP_BUILD_LOOP = 1;
  let STATUS = 'Building Map...';
  const NO_LINK_STRING = 'BBBBBBB';

  const DEFAULT_POSITION = {
    top: 0,
    left: 0
  };
  
  const MAP_PIECE_OFFSETS = CONST_MAP_PIECE_OFFSETS_RENDER;
  
  function buildMap() {
    const FIRST_MAP_PIECE = _.find(MAP_PIECES, (mapPiece) => {
      // Find top left corner piece
      return mapPiece.id > 19 && mapPiece.links[5] === NO_LINK_STRING & mapPiece.links[6] === NO_LINK_STRING && mapPiece.links[1] === NO_LINK_STRING;
    });
    
    removeMapPieceFromRemainingPieces(FIRST_MAP_PIECE);
    addMapPieceToPosition(FIRST_MAP_PIECE, DEFAULT_POSITION.top, DEFAULT_POSITION.left);
    fitPiecesTogether();

  }
  function markNextDeadPieces()
  {
    // remove the orphaned pieces.
    MAP_PIECES_REMAINING.forEach(mapPiece => {
      mapPiece.status = 'orphan';
    });
    let touchedPieces = 0;
    MAP_PIECES.forEach(mapPiece =>
      {
        if (mapPiece.status != 'live' )
          return;

        let liveNeighbors = mapPiece.openings.length;

        mapPiece.openings.forEach(opening =>{
            
            if (mapPiece[opening] !== null && mapPiece[opening] !== -1)
            {
              // not Unknown Piece, and not exit piece
              if (mapPiece[opening].status == 'dead')
                liveNeighbors--;
            }

        });
        if (liveNeighbors <= 1) {
          var mapPieceHTMLObject = document.getElementById('map-piece-' + mapPiece.id);
          if (mapPieceHTMLObject !== null)
          {
            mapPieceHTMLObject.classList.remove('map-piece-live');
            mapPieceHTMLObject.classList.add('map-piece-dead');
            mapPiece.status = 'dead';
            touchedPieces++;
          }
          else
          {
            console.log("Found null map piece ID: " + mapPiece.id);
          }
        }
      })
    return touchedPieces;

  }

  function markOrphanPieces()
  {
    MAP_PIECES_REMAINING.forEach(mapPiece => {
      mapPiece.status = 'orphan';
    });
  }

  function markKnownGoodPieces()
  {
    // remove the orphaned pieces.
    let touchedPieces = 0;
    MAP_PIECES.forEach(mapPiece =>
      {
        if (mapPiece.status != 'good' )
          return;

        mapPiece.openings.forEach(opening =>{
            
            if (mapPiece[opening] !== null && mapPiece[opening] !== -1)
            {
              if (mapPiece[opening].status == 'live') {
                mapPiece[opening].status = 'good';
                var mapPieceHTMLObject = document.getElementById('map-piece-' + mapPiece[opening].id);
                if (mapPieceHTMLObject !== null)
                {
                  mapPieceHTMLObject.classList.remove('map-piece-live');
                  mapPieceHTMLObject.classList.add('map-piece-good');
                  touchedPieces++;
                }
              }
            }

        });
      })
    return touchedPieces;
  }

  function fitPiecesTogether() {
    let ADDED_MAP_PIECES_COUNT = MAP_PIECES_ADDED.length;
    const MAX_PIECES_COUNT_TO_BE_ADDED = 2147483647;

    const fitPiecesLoop = (callback) => {
      fitPieces(() => {
        CURRENT_MAP_BUILD_LOOP++;
        updateHeaderInfo();
        if (ADDED_MAP_PIECES_COUNT < MAX_PIECES_COUNT_TO_BE_ADDED && ADDED_MAP_PIECES_COUNT < MAP_PIECES_ADDED.length) {
          ADDED_MAP_PIECES_COUNT = MAP_PIECES_ADDED.length;
          setTimeout(() => {
            fitPiecesLoop(callback);
          }, 10);
        } else {
          callback();
        }
      });
    };

    const fitPieces = (callback) => {
      _.each(MAP_PIECES_ADDED, addedMapPiece => {
        if (!addedMapPiece.checked) {
          _.each(MAP_PIECES_REMAINING, remainingMapPiece => {
            checkIfMapPiecesMatchesWithSurroundCheck(addedMapPiece, remainingMapPiece);
          });

          addedMapPiece.checked = true;
        }
      });

      callback();
    };

    fitPiecesLoop(() => {
      STATUS = 'Map Finished!';
      updateHeaderInfo();
      console.log('Remaining Map Pieces', MAP_PIECES_REMAINING);
      
      markOrphanPieces();

      touchedPieces = markNextDeadPieces();
      while (touchedPieces > 0)
      {
        touchedPieces = markNextDeadPieces();
      }

      touchedPieces = markKnownGoodPieces();
      while (touchedPieces > 0)
      {
        touchedPieces = markKnownGoodPieces();
      }
    });
  }

  function loadMapData() {
    return new Promise((resolve) => {
      $.get(`./data/map-pieces-data.txt?timestamp=${Date.now()}`).then((mapData) => {
        const MAP_DATA_ARRAY = mapData.split('\n');

        let mapPieceId = 1;
        _.each(MAP_DATA_ARRAY, data => {
          const MAP_PIECE_DATA_ARRAY = data.split('\t');

          const OPENINGS = MAP_PIECE_DATA_ARRAY[1].split(',');
          for (let i = 0; i < OPENINGS.length; i++) {
            OPENINGS[i] = parseInt(OPENINGS[i]);
          }

          const MAP_PIECE_JSON = {
            id: mapPieceId,
            center: MAP_PIECE_DATA_ARRAY[0],
            openings: OPENINGS,
            links: {
              1: MAP_PIECE_DATA_ARRAY[2],
              2: MAP_PIECE_DATA_ARRAY[3],
              3: MAP_PIECE_DATA_ARRAY[4],
              4: MAP_PIECE_DATA_ARRAY[5],
              5: MAP_PIECE_DATA_ARRAY[6],
              6: MAP_PIECE_DATA_ARRAY[7],
            },
            status: 'live',
            position: {
            },
            checked: false,
          };
          MAP_PIECE_JSON.openings.forEach(opening => {
            MAP_PIECE_JSON[opening] = { status: 'unknown' };
            if (MAP_PIECE_JSON.links[opening] === NO_LINK_STRING)
              MAP_PIECE_JSON.status = 'good'
          })
         
          switch(MAP_PIECE_JSON.status)
          {
            case 'good':
              MAP_PIECES_GOOD.push(MAP_PIECE_JSON);
              break;
            case 'live':
              MAP_PIECES_LIVE.push(MAP_PIECE_JSON);
              break;
            case 'dead':
              MAP_PIECES_DEAD.push(MAP_PIECE_JSON);
              break;
          }
          MAP_PIECES.push(MAP_PIECE_JSON);
          mapPieceId++;
        });

        MAP_PIECES_REMAINING = MAP_PIECES;
        resolve();
      });
    });
  }

  function getMapPieceHTML(mapPiece) {
    return `
      <div id="map-piece-${mapPiece.id}" class="map-piece map-piece-${ mapPiece.status }">
        <div class="map-piece__inner">
          <div class="map-piece__symbol map-piece__symbol--${mapPiece.center.charAt(0).toLowerCase()} ${mapPiece.id < 20 ? 'map-piece__symbol--highlighted' : ''}">
            
          </div>
          <div class="map-piece__opening map-piece__opening--1 map-piece__opening--${_.includes(mapPiece.openings, 1) ? 'open' : 'closed'} map-piece__opening--${mapPiece.links[1]}"></div>
          <div class="map-piece__opening map-piece__opening--2 map-piece__opening--${_.includes(mapPiece.openings, 2) ? 'open' : 'closed'} map-piece__opening--${mapPiece.links[2]}"></div>
          <div class="map-piece__opening map-piece__opening--3 map-piece__opening--${_.includes(mapPiece.openings, 3) ? 'open' : 'closed'} map-piece__opening--${mapPiece.links[3]}"></div>
          <div class="map-piece__opening map-piece__opening--4 map-piece__opening--${_.includes(mapPiece.openings, 4) ? 'open' : 'closed'} map-piece__opening--${mapPiece.links[4]}"></div>
          <div class="map-piece__opening map-piece__opening--5 map-piece__opening--${_.includes(mapPiece.openings, 5) ? 'open' : 'closed'} map-piece__opening--${mapPiece.links[5]}"></div>
          <div class="map-piece__opening map-piece__opening--6 map-piece__opening--${_.includes(mapPiece.openings, 6) ? 'open' : 'closed'} map-piece__opening--${mapPiece.links[6]}"></div>
        </div>
      </div>
    `;
  }

  function removeMapPieceFromRemainingPieces(mapPiece) {
    MAP_PIECES_REMAINING = _.filter(MAP_PIECES_REMAINING, mapPieceRemaining => {
      return mapPieceRemaining.id != mapPiece.id;
    });
  }

  function addMapPieceToPosition(mapPiece, top, left) {
    mapPiece.position.top = top;
    mapPiece.position.left = left;
    $('#d2-cot-map').append(getMapPieceHTML(mapPiece));
    $(`#map-piece-${mapPiece.id}`).css({
      top: `${mapPiece.position.top}px`,
      left: `${mapPiece.position.left}px`
    });

    MAP_PIECES_ADDED.push(mapPiece);
  }

  function checkIfMapPiecesMatchesWithOffset(addedMapPiece, remainingMapPiece, offset) {
    const ADDED_MAP_PIECE_OFFSET_OPEN = _.includes(addedMapPiece.openings, offset.opening);
    const REMAINING_MAP_PIECE_OFFSET_OPEN = _.includes(remainingMapPiece.openings, offset.pair);

    if (ADDED_MAP_PIECE_OFFSET_OPEN === REMAINING_MAP_PIECE_OFFSET_OPEN &&
        addedMapPiece.links[offset.opening] != NO_LINK_STRING &&
        remainingMapPiece.links[offset.pair] != NO_LINK_STRING &&
        addedMapPiece.links[offset.opening] === remainingMapPiece.links[offset.pair]
        
        ) {

      addedMapPiece[offset.opening] = remainingMapPiece;
      remainingMapPiece[offset.pair] = addedMapPiece;
      return true;
    } else {
      return false;
    }
  }

  function checkIfMapPiecesMatchesWithSurroundCheck(addedMapPiece, remainingMapPiece) {
    _.each(MAP_PIECE_OFFSETS, (offset) => {
      if (checkIfMapPiecesMatchesWithOffset(addedMapPiece, remainingMapPiece, offset)) {
        const NEW_MAP_PIECE_POSITION = getPositionForMapPiece(addedMapPiece);
        NEW_MAP_PIECE_POSITION.top = NEW_MAP_PIECE_POSITION.top + offset.top;
        NEW_MAP_PIECE_POSITION.left = NEW_MAP_PIECE_POSITION.left + offset.left;

        const ALREADY_MAP_PIECE_IN_THIS_POSITION = getMapPieceWithPosition(NEW_MAP_PIECE_POSITION);
        if (!ALREADY_MAP_PIECE_IN_THIS_POSITION && checkIfMapPieceCanBeAddedToPosition(remainingMapPiece, NEW_MAP_PIECE_POSITION)) {
          removeMapPieceFromRemainingPieces(remainingMapPiece);
          addMapPieceToPosition(remainingMapPiece, NEW_MAP_PIECE_POSITION.top, NEW_MAP_PIECE_POSITION.left);
          getPositionForMapPiece(addedMapPiece);
        }
      }
    });
  }

  function checkIfMapPieceCanBeAddedToPosition(mapPiece, position) {
    let CONFLICTING_PIECES = false;
    
    _.each(MAP_PIECE_OFFSETS, (offset) => {
      const POSITION_FOR_EXISTING_MAP_PIECE = {
        top: position.top + offset.top,
        left: position.left + offset.left,
      };
      const MAP_PIECE_AT_OFFSET = getMapPieceWithPosition(POSITION_FOR_EXISTING_MAP_PIECE);

      if (MAP_PIECE_AT_OFFSET && !checkIfMapPiecesMatchesWithOffset(mapPiece, MAP_PIECE_AT_OFFSET, offset)) {
        CONFLICTING_PIECES = true;
      }
    });

    return !CONFLICTING_PIECES;
  }

  function getPositionForMapPiece(mapPiece) {
    return { top: mapPiece.position.top, left: mapPiece.position.left };
  }

  function getMapPieceWithPosition(position) {
    return _.find(MAP_PIECES_ADDED, (mapPiece) => {
      return mapPiece.position.top === position.top && mapPiece.position.left === position.left;
    })
  }

  function updateHeaderInfo() {
    $('#header__info').html(` 
      Matching: <strong>${MAP_PIECES_ADDED.length}</strong><br/>
      Remaining: <strong>${MAP_PIECES_REMAINING.length}</strong><br/>
      <hr>
      Match Loops: <strong>${CURRENT_MAP_BUILD_LOOP}</strong><br/>
      <hr>
      Total Pieces: <strong>${MAP_PIECES.length}</strong><br/>
      Map Built*: <strong>${Math.round(MAP_PIECES_ADDED.length / MAP_PIECES.length * 100)}%</strong><br/><br/>
      Status: <strong>${STATUS}</strong>
    `);
  }

  loadMapData().then(() => {
    buildMap();
  });
});
